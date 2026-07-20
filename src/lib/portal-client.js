/* BAYWORKS — shared transport for the 3 self-serve portal API clients
 * (customer / partner / developer). Each portal's own *-api.js file keeps its
 * domain-specific exports (referLead, updateUnit, saveRequirement, ...) but
 * delegates the token storage + fetch/error boilerplate to this factory —
 * that plumbing was previously copy-pasted three times.
 *
 * Deliberately NOT unified: whether a 401 clears the local session. The
 * customer portal treats a failed/unreachable CRM as "go offline", not
 * "log the user out" — partner/developer have no offline mode and should
 * drop the session immediately on a real 401. Pass `autoLogoutOn401` to
 * choose (see portal-api.js vs partner-api.js/developer-api.js).
 */
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const CRM_BASE = env.VITE_CRM_BASE || '/crm-api';
export const DEFAULT_CAPTURE_TOKEN = env.VITE_CRM_TOKEN || 'cmrkfynyt0001nzfcjj9x0jcl';

// "Remember me" is client-side session bookkeeping, same approach the customer
// portal's auth.js already uses: the server JWT itself is always the same
// long-lived token, but we self-expire the LOCAL session sooner when the box
// isn't checked, so a shared/public device doesn't stay signed in for 30 days.
const SESSION_SHORT = 12 * 60 * 60 * 1000;       // 12h  (no "remember me")
const SESSION_LONG  = 30 * 24 * 60 * 60 * 1000;  // 30d  ("remember me")

export function createPortalClient({ basePath, tokenKey, userKey, autoLogoutOn401 = true }) {
  const expiryKey = `${tokenKey}_expiresAt`;
  class ApiError extends Error {
    constructor(message, { code, status, network } = {}) {
      super(message); this.name = 'ApiError';
      this.code = code; this.status = status; this.network = !!network;
    }
  }

  const token = () => localStorage.getItem(tokenKey);
  const setToken = (t) => { if (t) localStorage.setItem(tokenKey, t); };
  const clearToken = () => localStorage.removeItem(tokenKey);

  function logout() {
    clearToken();
    localStorage.removeItem(expiryKey);
    if (userKey) localStorage.removeItem(userKey);
  }

  /** True once the locally-tracked "remember me" window has passed — doesn't
   *  mean the server JWT itself expired, just that this device should be
   *  treated as signed out. Self-heals by logging out on the way out. */
  function sessionExpired() {
    const raw = localStorage.getItem(expiryKey);
    if (!raw) return false; // no expiry recorded (e.g. pre-existing session) — don't force a logout
    if (Number(raw) > Date.now()) return false;
    logout();
    return true;
  }

  async function req(path, { method = 'GET', body, auth = false } = {}) {
    let res;
    try {
      res = await fetch(CRM_BASE + basePath + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(auth ? { Authorization: `Bearer ${token()}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError('Network unreachable', { network: true });
    }
    if (autoLogoutOn401 && auth && res.status === 401) { logout(); throw new ApiError('Session expired', { status: 401 }); }

    let data = null;
    try { data = await res.json(); } catch { /* empty/non-JSON body */ }

    if (!res.ok) {
      const msg = (data && (Array.isArray(data.message) ? data.message[0] : data.message)) || `HTTP ${res.status}`;
      // 5xx (incl. Vite proxy "ECONNREFUSED" → 500) means the backend is down: treat as network.
      throw new ApiError(msg, { status: res.status, code: data?.code, network: res.status >= 500 });
    }
    return data;
  }

  /** Raw text fetch (bypasses the JSON path) — used for CSV-style downloads. */
  async function reqText(path) {
    const res = await fetch(CRM_BASE + basePath + path, { headers: { Authorization: `Bearer ${token()}` } });
    if (autoLogoutOn401 && res.status === 401) { logout(); throw new ApiError('Session expired', { status: 401 }); }
    if (!res.ok) throw new ApiError('Could not download file', { status: res.status });
    return res.text();
  }

  function save(res, remember = false) {
    if (res?.accessToken) {
      setToken(res.accessToken);
      localStorage.setItem(expiryKey, String(Date.now() + (remember ? SESSION_LONG : SESSION_SHORT)));
    }
    if (userKey && res?.user) localStorage.setItem(userKey, JSON.stringify(res.user));
    return res?.user;
  }

  function cachedUser() {
    if (!userKey) return null;
    try { return JSON.parse(localStorage.getItem(userKey) || 'null'); } catch { return null; }
  }

  const isAuthenticated = () => !!token() && !sessionExpired();

  function requireAuth(loginUrl) {
    if (isAuthenticated()) return true;
    location.replace(`${loginUrl}?next=${encodeURIComponent(location.pathname + location.search)}`);
    return false;
  }

  return { ApiError, req, reqText, token, setToken, clearToken, save, logout, cachedUser, isAuthenticated, requireAuth };
}
