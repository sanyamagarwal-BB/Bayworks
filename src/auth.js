/* BAYWORKS — Customer Portal Auth
 * ---------------------------------------------------------------------------
 * Self-contained customer authentication for the marketing site.
 *
 * Architecture: register()/login() call the real CRM portal API first
 * (src/portal-api.js → /crm-api/portal/*). If the CRM is unreachable they fall
 * back to a localStorage store so the portal still works offline / in demos.
 * API sessions are tagged `mode:'api'`; the dashboard reads live data for those
 * and mock data otherwise. Mirrors the graceful-fallback pattern in crm.js.
 *
 * SECURITY NOTE: the localStorage fallback is demo-grade only (client-side
 * hashing). Real auth — bcrypt, rate limiting, scoping — lives server-side in
 * the CRM `portal` module; that path is used whenever the CRM is up.
 * ------------------------------------------------------------------------- */
import * as portal from './portal-api.js';

const USERS_KEY    = 'bayworks_portal_users';
const SESSION_KEY  = 'bayworks_portal_session';
const ATTEMPTS_KEY = 'bayworks_portal_attempts';
const RESET_KEY    = 'bayworks_portal_resets';
const USER_CACHE   = 'bayworks_portal_apiuser'; // cached user for API sessions

const MAX_ATTEMPTS   = 5;
const LOCKOUT_MS     = 15 * 60 * 1000;        // 15 min lockout after MAX_ATTEMPTS
const SESSION_SHORT  = 12 * 60 * 60 * 1000;   // 12h  (no "remember me")
const SESSION_LONG   = 30 * 24 * 60 * 60 * 1000; // 30d ("remember me")

/* ── tiny helpers ───────────────────────────────────────────── */
const read  = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota/blocked */ } };
const normEmail = (e) => String(e || '').trim().toLowerCase();
const uid = () => 'cus_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Demo-only hash. NOT secure — server must hash for real deployments. */
async function hash(text) {
  if (window.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback for non-secure contexts
  let h = 0;
  for (let i = 0; i < text.length; i++) { h = (h << 5) - h + text.charCodeAt(i); h |= 0; }
  return 'x' + (h >>> 0).toString(16);
}

/* ── validation (pure, reusable by the UI) ──────────────────── */
export const validators = {
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim()),
  phone: (v) => /^[+]?[\d\s()-]{7,18}$/.test(String(v || '').trim()),
  required: (v) => String(v || '').trim().length > 0,
  minLen: (v, n) => String(v || '').length >= n,
};

/**
 * Score a password 0–4 with a human label and the rules it still fails.
 * @returns {{score:number,label:string,unmet:string[]}}
 */
export function passwordStrength(pw) {
  pw = String(pw || '');
  const rules = [
    { ok: pw.length >= 8,        msg: 'at least 8 characters' },
    { ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw), msg: 'upper & lower case' },
    { ok: /\d/.test(pw),         msg: 'a number' },
    { ok: /[^A-Za-z0-9]/.test(pw), msg: 'a symbol' },
  ];
  const score = rules.filter(r => r.ok).length;
  const label = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][score];
  return { score, label, unmet: rules.filter(r => !r.ok).map(r => r.msg) };
}

/* ── lockout (brute-force protection) ───────────────────────── */
function attemptsFor(email) {
  const all = read(ATTEMPTS_KEY, {});
  return all[email] || { count: 0, lockedUntil: 0 };
}
function lockState(email) {
  const a = attemptsFor(email);
  if (a.lockedUntil && a.lockedUntil > Date.now()) {
    return { locked: true, remainingMs: a.lockedUntil - Date.now() };
  }
  return { locked: false, remainingMs: 0, left: Math.max(0, MAX_ATTEMPTS - a.count) };
}
function recordFail(email) {
  const all = read(ATTEMPTS_KEY, {});
  const a = all[email] || { count: 0, lockedUntil: 0 };
  a.count += 1;
  if (a.count >= MAX_ATTEMPTS) { a.lockedUntil = Date.now() + LOCKOUT_MS; a.count = 0; }
  all[email] = a; write(ATTEMPTS_KEY, all);
}
function clearFails(email) {
  const all = read(ATTEMPTS_KEY, {});
  delete all[email]; write(ATTEMPTS_KEY, all);
}

/* ── the storage-backed auth core (swap this for an API later) ── */
const localStore = {
  async register({ name, company, email, phone, password }) {
    email = normEmail(email);
    const users = read(USERS_KEY, {});
    if (users[email]) throw new AuthError('An account with this email already exists.', 'EXISTS');
    const user = {
      id: uid(), name: name.trim(), company: (company || '').trim(),
      email, phone: (phone || '').trim(),
      passwordHash: await hash(password), createdAt: Date.now(),
    };
    users[email] = user; write(USERS_KEY, users);
    return publicUser(user);
  },

  async login({ email, password, remember }) {
    email = normEmail(email);
    const lock = lockState(email);
    if (lock.locked) {
      const mins = Math.ceil(lock.remainingMs / 60000);
      throw new AuthError(`Too many attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''}.`, 'LOCKED');
    }
    const users = read(USERS_KEY, {});
    const user = users[email];
    const ok = user && user.passwordHash === await hash(password);
    if (!ok) {
      recordFail(email);
      const left = Math.max(0, MAX_ATTEMPTS - attemptsFor(email).count);
      throw new AuthError(
        left > 0 ? `Incorrect email or password. ${left} attempt${left > 1 ? 's' : ''} left.`
                 : 'Incorrect email or password.', 'BAD_CREDENTIALS');
    }
    clearFails(email);
    const session = {
      token: uid() + uid(),
      userId: user.id, email: user.email, name: user.name,
      issuedAt: Date.now(),
      expiresAt: Date.now() + (remember ? SESSION_LONG : SESSION_SHORT),
    };
    write(SESSION_KEY, session);
    return publicUser(user);
  },

  async requestReset(email) {
    email = normEmail(email);
    const users = read(USERS_KEY, {});
    // Always succeed to avoid leaking which emails exist (enumeration safety).
    if (users[email]) {
      const resets = read(RESET_KEY, {});
      resets[email] = { token: uid(), expiresAt: Date.now() + 60 * 60 * 1000 };
      write(RESET_KEY, resets);
    }
    return true;
  },
};

const store = localStore; // offline/demo fallback store

/* ── public session API (what pages import) ─────────────────── */
class AuthError extends Error {
  constructor(message, code) { super(message); this.name = 'AuthError'; this.code = code; }
}
function publicUser(u) { return { id: u.id, name: u.name, company: u.company, email: u.email, phone: u.phone }; }

/* Persist an API-issued session. `mode:'api'` tells getCurrentUser/dashboard to
 * read from the cached user / live API rather than the local user store. */
function saveApiSession(res, remember) {
  portal.setPortalToken(res.accessToken);
  write(SESSION_KEY, {
    mode: 'api', token: res.accessToken,
    name: res.user.name, email: res.user.email,
    issuedAt: Date.now(), expiresAt: Date.now() + (remember ? SESSION_LONG : SESSION_SHORT),
  });
  write(USER_CACHE, res.user);
}

/**
 * Register API-first, falling back to the local demo store only if the CRM is
 * unreachable. Real validation errors (e.g. email exists) are surfaced as-is.
 */
export async function register(data) {
  try {
    const res = await portal.register({
      name: data.name, email: data.email, phone: data.phone,
      company: data.company, password: data.password,
    });
    saveApiSession(res, true);
    return res.user;
  } catch (e) {
    if (e.network) return store.register(data); // offline → local demo
    throw new AuthError(e.message, e.status === 409 ? 'EXISTS' : e.code);
  }
}

/** Login API-first, falling back to the local demo store if the CRM is down. */
export async function login(creds) {
  try {
    const res = await portal.login({ email: creds.email, password: creds.password });
    saveApiSession(res, !!creds.remember);
    return res.user;
  } catch (e) {
    if (e.network) return store.login(creds); // offline → local demo (lockout etc.)
    throw new AuthError(e.message, e.status === 401 ? 'BAD_CREDENTIALS' : e.code);
  }
}

export const requestReset  = (email) => store.requestReset(email);
export const getLockState  = (email) => lockState(normEmail(email));

/** Current session if present and unexpired; otherwise null (auto-cleans expired). */
export function getSession() {
  const s = read(SESSION_KEY, null);
  if (!s) return null;
  if (s.expiresAt && s.expiresAt < Date.now()) { logout(); return null; }
  return s;
}
export const isAuthenticated = () => !!getSession();

/** True when the active session is backed by the live CRM API (not the demo store). */
export function isApiSession() { const s = getSession(); return !!(s && s.mode === 'api'); }

/** Full user record for the active session, or null. */
export function getCurrentUser() {
  const s = getSession();
  if (!s) return null;
  if (s.mode === 'api') return read(USER_CACHE, { name: s.name, email: s.email, company: '', phone: '' });
  const users = read(USERS_KEY, {});
  const u = users[s.email];
  return u ? publicUser(u) : null;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(USER_CACHE);
  portal.clearPortalToken();
}

/**
 * Guard a page: redirect to login (with return URL) if not authenticated.
 * @returns {boolean} true if authenticated.
 */
export function requireAuth(loginUrl = '/login.html') {
  if (isAuthenticated()) return true;
  const back = encodeURIComponent(location.pathname + location.search);
  location.replace(`${loginUrl}?next=${back}`);
  return false;
}

/* ── demo account seed ──────────────────────────────────────────
 * Bootstraps a known mock customer on first load so the portal can be
 * demoed without signing up. Idempotent: only writes if the account is
 * missing, and never touches an account the user may have edited.
 *   email: demo@bayworks.in   password: Demo@1234
 * Remove DEMO_ACCOUNT (or this call) before going to production.
 */
export const DEMO_ACCOUNT = {
  name: 'Demo Client', company: 'Acme Corp',
  email: 'demo@bayworks.in', phone: '+91 90000 00000',
  password: 'Demo@1234',
};

export async function seedDemoAccount() {
  const email = normEmail(DEMO_ACCOUNT.email);
  const users = read(USERS_KEY, {});
  if (users[email]) return false;
  users[email] = {
    id: uid(), name: DEMO_ACCOUNT.name, company: DEMO_ACCOUNT.company,
    email, phone: DEMO_ACCOUNT.phone,
    passwordHash: await hash(DEMO_ACCOUNT.password),
    createdAt: Date.now(), isDemo: true,
  };
  write(USERS_KEY, users);
  return true;
}

// Fire-and-forget seed on module load (runs on every page that imports auth.js).
seedDemoAccount().catch(() => { /* storage blocked — ignore */ });

export { AuthError };
