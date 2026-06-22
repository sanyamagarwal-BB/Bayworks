/* BAYWORKS — Developer/Landlord portal API client + session
 * Talks to the CRM developer-portal endpoints (/crm-api/developer-portal/*).
 */
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const BASE = env.VITE_CRM_BASE || '/crm-api';
const CAPTURE_TOKEN = env.VITE_CRM_TOKEN || 'cap_ohlt1p4glsp';
const TOKEN_KEY = 'bayworks_developer_token';
const USER_KEY  = 'bayworks_developer_user';

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

export async function register(d) { return save(await req('/developer-portal/auth/register', { method: 'POST', body: { ...d, token: CAPTURE_TOKEN } })); }
export async function login(d) {
  const res = await req('/developer-portal/auth/login', { method: 'POST', body: { ...d, token: CAPTURE_TOKEN } });
  if (res?.twoFactorRequired) return res;
  return save(res);
}
export async function verify2fa(ticket, code) { return save(await req('/developer-portal/auth/2fa', { method: 'POST', body: { ticket, code } })); }
export const forgotPassword = (email) => req('/developer-portal/auth/forgot', { method: 'POST', body: { email, token: CAPTURE_TOKEN } });
export const twoFaStatus  = ()     => req('/developer-portal/2fa/status',  { auth: true });
export const twoFaSetup   = ()     => req('/developer-portal/2fa/setup',   { method: 'POST', auth: true });
export const twoFaEnable  = (code) => req('/developer-portal/2fa/enable',  { method: 'POST', body: { code }, auth: true });
export const twoFaDisable = (code) => req('/developer-portal/2fa/disable', { method: 'POST', body: { code }, auth: true });

export const me       = () => req('/developer-portal/me',       { auth: true });
export const summary  = () => req('/developer-portal/summary',  { auth: true });
export const projects = () => req('/developer-portal/projects', { auth: true });
export const units    = () => req('/developer-portal/units',    { auth: true });
export const demand   = () => req('/developer-portal/demand',   { auth: true });
export const visits   = () => req('/developer-portal/visits',   { auth: true });
export const confirmVisit = (id) => req(`/developer-portal/visits/${encodeURIComponent(id)}/confirm`, { method: 'POST', auth: true });
export const updateUnit = (unitId, patch) => req(`/developer-portal/units/${encodeURIComponent(unitId)}`, { method: 'PATCH', body: patch, auth: true });

export const isAuthenticated = () => !!token();
export function cachedUser() { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; } }
export function logout() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }

export function requireAuth(loginUrl = '/developer-login.html') {
  if (isAuthenticated()) return true;
  location.replace(`${loginUrl}?next=${encodeURIComponent(location.pathname + location.search)}`);
  return false;
}
