/* BAYWORKS — Customer portal API client
 * Talks to the CRM portal endpoints (POST /portal/auth/*, GET /portal/*).
 * In dev this routes through the Vite proxy (/crm-api → :3001/api).
 *
 * Every call throws ApiError. `.network === true` means the CRM was
 * unreachable (proxy down / 5xx) — callers use that to fall back to the
 * offline localStorage flow, so the portal degrades gracefully (same
 * resilience contract as crm.js).
 */
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const BASE = env.VITE_CRM_BASE || '/crm-api';
const CAPTURE_TOKEN = env.VITE_CRM_TOKEN || 'cap_ohlt1p4glsp';
const TOKEN_KEY = 'bayworks_portal_token';

export const portalToken    = () => localStorage.getItem(TOKEN_KEY);
export const setPortalToken = (t) => { if (t) localStorage.setItem(TOKEN_KEY, t); };
export const clearPortalToken = () => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(message, { code, status, network } = {}) {
    super(message); this.name = 'ApiError';
    this.code = code; this.status = status; this.network = !!network;
  }
}

async function req(path, { method = 'GET', body, auth = false } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: `Bearer ${portalToken()}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Network unreachable', { network: true });
  }

  let data = null;
  try { data = await res.json(); } catch { /* empty/non-JSON body */ }

  if (!res.ok) {
    const msg = (data && (Array.isArray(data.message) ? data.message[0] : data.message)) || `HTTP ${res.status}`;
    // 5xx (incl. Vite proxy "ECONNREFUSED" → 500) means the backend is down: treat as network.
    throw new ApiError(msg, { status: res.status, code: data?.code, network: res.status >= 500 });
  }
  return data;
}

export const register    = (d) => req('/portal/auth/register', { method: 'POST', body: { ...d, token: CAPTURE_TOKEN } });
export const login       = (d) => req('/portal/auth/login',    { method: 'POST', body: { ...d, token: CAPTURE_TOKEN } });
export const forgotPassword = (email)          => req('/portal/auth/forgot', { method: 'POST', body: { email, token: CAPTURE_TOKEN } });
export const resetPassword  = (token, password) => req('/portal/auth/reset',  { method: 'POST', body: { token, password } });
export const verify2fa      = (ticket, code)    => req('/portal/auth/2fa',    { method: 'POST', body: { ticket, code } });
export const twoFaStatus    = ()      => req('/portal/2fa/status',  { auth: true });
export const twoFaSetup     = ()      => req('/portal/2fa/setup',   { method: 'POST', auth: true });
export const twoFaEnable    = (code)  => req('/portal/2fa/enable',  { method: 'POST', body: { code }, auth: true });
export const twoFaDisable   = (code)  => req('/portal/2fa/disable', { method: 'POST', body: { code }, auth: true });
export const me          = ()  => req('/portal/me',          { auth: true });
export const updateMe    = (d) => req('/portal/me',          { method: 'PATCH', body: d, auth: true });
export const summary     = ()  => req('/portal/summary',     { auth: true });
export const requirement = ()  => req('/portal/requirement', { auth: true });
export const requirementForm = () => req('/portal/requirement-form', { auth: true });
export const saveRequirement = (d) => req('/portal/requirement', { method: 'PUT', body: d, auth: true });
export const shortlist   = ()  => req('/portal/shortlist',   { auth: true });
export const visits      = ()  => req('/portal/visits',      { auth: true });

export const bookVisit       = (data)   => req('/portal/visits',    { method: 'POST', body: data, auth: true });
export const documents       = ()    => req('/portal/documents', { auth: true });
export const documentUrl     = (id)  => req(`/portal/documents/${encodeURIComponent(id)}`, { auth: true });
export const uploadDocument  = (doc) => req('/portal/documents', { method: 'POST', body: doc, auth: true });
export const deleteDocument  = (id)  => req(`/portal/documents/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true });
export const proposals       = ()       => req('/portal/proposals', { auth: true });
export const proposal        = (id)     => req(`/portal/proposals/${encodeURIComponent(id)}`, { auth: true });
export const respondProposal = (id, accept) => req(`/portal/proposals/${encodeURIComponent(id)}/respond`, { method: 'POST', body: { accept }, auth: true });
export const addShortlist    = (unitId) => req('/portal/shortlist', { method: 'POST', body: { unitId }, auth: true });
export const removeShortlist = (unitId) => req(`/portal/shortlist/${encodeURIComponent(unitId)}`, { method: 'DELETE', auth: true });

/** Set of unitIds already shortlisted by the current customer ({} on failure). */
export async function savedUnitIds() {
  try {
    const { items } = await shortlist();
    return new Set((items || []).map((i) => i.unitId).filter(Boolean));
  } catch {
    return new Set();
  }
}

export const activity = () => req('/portal/activity', { auth: true });
