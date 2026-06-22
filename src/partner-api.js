/* BAYWORKS — Channel Partner portal API client + session
 * Talks to the CRM partner-portal endpoints (/crm-api/partner-portal/*).
 * Self-contained session (token + cached user in localStorage). No offline
 * fallback — the partner portal requires the CRM (it's all live CRM data).
 */
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const BASE = env.VITE_CRM_BASE || '/crm-api';
const CAPTURE_TOKEN = env.VITE_CRM_TOKEN || 'cap_ohlt1p4glsp';
const TOKEN_KEY = 'bayworks_partner_token';
const USER_KEY  = 'bayworks_partner_user';

export class ApiError extends Error {
  constructor(message, { code, status, network } = {}) {
    super(message); this.name = 'ApiError'; this.code = code; this.status = status; this.network = !!network;
  }
}

const token = () => localStorage.getItem(TOKEN_KEY);

async function req(path, { method = 'GET', body, auth = false } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${token()}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch { throw new ApiError('Network unreachable', { network: true }); }
  if (res.status === 401 && auth) { logout(); throw new ApiError('Session expired', { status: 401 }); }
  let data = null; try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    const msg = (data && (Array.isArray(data.message) ? data.message[0] : data.message)) || `HTTP ${res.status}`;
    throw new ApiError(msg, { status: res.status, code: data?.code, network: res.status >= 500 });
  }
  return data;
}

function save(res) {
  if (res?.accessToken) localStorage.setItem(TOKEN_KEY, res.accessToken);
  if (res?.user) localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  return res?.user;
}

export async function register(d) { return save(await req('/partner-portal/auth/register', { method: 'POST', body: { ...d, token: CAPTURE_TOKEN } })); }
export async function login(d) {
  const res = await req('/partner-portal/auth/login', { method: 'POST', body: { ...d, token: CAPTURE_TOKEN } });
  if (res?.twoFactorRequired) return res;           // needs a 2FA code; don't save yet
  return save(res);
}
export async function verify2fa(ticket, code) { return save(await req('/partner-portal/auth/2fa', { method: 'POST', body: { ticket, code } })); }
export const forgotPassword = (email) => req('/partner-portal/auth/forgot', { method: 'POST', body: { email, token: CAPTURE_TOKEN } });
export const twoFaStatus  = ()     => req('/partner-portal/2fa/status',  { auth: true });
export const twoFaSetup   = ()     => req('/partner-portal/2fa/setup',   { method: 'POST', auth: true });
export const twoFaEnable  = (code) => req('/partner-portal/2fa/enable',  { method: 'POST', body: { code }, auth: true });
export const twoFaDisable = (code) => req('/partner-portal/2fa/disable', { method: 'POST', body: { code }, auth: true });

export const me          = () => req('/partner-portal/me',          { auth: true });
export const updateMe    = (d) => req('/partner-portal/me', { method: 'PATCH', body: d, auth: true });
export const summary     = () => req('/partner-portal/summary',     { auth: true });
export const leads       = () => req('/partner-portal/leads',       { auth: true });
export const referLead   = (d) => req('/partner-portal/leads',      { method: 'POST', body: d, auth: true });
export const commissions = () => req('/partner-portal/commissions', { auth: true });
export async function commissionStatement() {
  const res = await fetch(BASE + '/partner-portal/commissions/statement', { headers: { Authorization: `Bearer ${token()}` } });
  if (res.status === 401) { logout(); throw new ApiError('Session expired', { status: 401 }); }
  if (!res.ok) throw new ApiError('Could not download statement', { status: res.status });
  return res.text();
}

export const isAuthenticated = () => !!token();
export function cachedUser() { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; } }
export function logout() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }

/** Guard a partner page: redirect to login (with ?next=) if not signed in. */
export function requireAuth(loginUrl = '/partner-login.html') {
  if (isAuthenticated()) return true;
  location.replace(`${loginUrl}?next=${encodeURIComponent(location.pathname + location.search)}`);
  return false;
}

export const documents      = ()    => req('/partner-portal/documents', { auth: true });
export const documentUrl    = (id)  => req(`/partner-portal/documents/${encodeURIComponent(id)}`, { auth: true });
export const uploadDocument = (doc) => req('/partner-portal/documents', { method: 'POST', body: doc, auth: true });
export const deleteDocument = (id)  => req(`/partner-portal/documents/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true });

export const activity = () => req('/partner-portal/activity', { auth: true });
