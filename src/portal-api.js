/* BAYWORKS — Customer portal API client
 * Talks to the CRM portal endpoints (POST /portal/auth/*, GET /portal/*).
 * In dev this routes through the Vite proxy (/crm-api → :3001/api).
 *
 * Every call throws ApiError. `.network === true` means the CRM was
 * unreachable (proxy down / 5xx) — callers use that to fall back to the
 * offline localStorage flow, so the portal degrades gracefully (same
 * resilience contract as crm.js). Unlike partner/developer, a 401 here does
 * NOT clear the local session — that's what keeps the offline flow usable.
 */
import { createPortalClient, DEFAULT_CAPTURE_TOKEN } from './lib/portal-client.js';

const CAPTURE_TOKEN = DEFAULT_CAPTURE_TOKEN;
const { ApiError, req, token, setToken, clearToken } = createPortalClient({
  basePath: '/portal', tokenKey: 'bayworks_portal_token', autoLogoutOn401: false,
});

export const portalToken      = token;
export const setPortalToken   = setToken;
export const clearPortalToken = clearToken;
export { ApiError };

export const register    = (d) => req('/auth/register', { method: 'POST', body: { ...d, token: CAPTURE_TOKEN } });
export const login       = (d) => req('/auth/login',    { method: 'POST', body: { ...d, token: CAPTURE_TOKEN } });
export const forgotPassword = (email)          => req('/auth/forgot', { method: 'POST', body: { email, token: CAPTURE_TOKEN } });
export const resetPassword  = (token, password) => req('/auth/reset',  { method: 'POST', body: { token, password } });
export const verify2fa      = (ticket, code)    => req('/auth/2fa',    { method: 'POST', body: { ticket, code } });
export const twoFaStatus    = ()      => req('/2fa/status',  { auth: true });
export const twoFaSetup     = ()      => req('/2fa/setup',   { method: 'POST', auth: true });
export const twoFaEnable    = (code)  => req('/2fa/enable',  { method: 'POST', body: { code }, auth: true });
export const twoFaDisable   = (code)  => req('/2fa/disable', { method: 'POST', body: { code }, auth: true });
export const me          = ()  => req('/me',          { auth: true });
export const updateMe    = (d) => req('/me',          { method: 'PATCH', body: d, auth: true });
export const summary     = ()  => req('/summary',     { auth: true });
export const requirement = ()  => req('/requirement', { auth: true });
export const requirementForm = () => req('/requirement-form', { auth: true });
export const saveRequirement = (d) => req('/requirement', { method: 'PUT', body: d, auth: true });
export const shortlist   = ()  => req('/shortlist',   { auth: true });
export const visits      = ()  => req('/visits',      { auth: true });

export const bookVisit       = (data)   => req('/visits',    { method: 'POST', body: data, auth: true });
export const documents       = ()    => req('/documents', { auth: true });
export const documentUrl     = (id)  => req(`/documents/${encodeURIComponent(id)}`, { auth: true });
export const uploadDocument  = (doc) => req('/documents', { method: 'POST', body: doc, auth: true });
export const deleteDocument  = (id)  => req(`/documents/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true });
export const proposals       = ()       => req('/proposals', { auth: true });
export const proposal        = (id)     => req(`/proposals/${encodeURIComponent(id)}`, { auth: true });
export const respondProposal = (id, accept) => req(`/proposals/${encodeURIComponent(id)}/respond`, { method: 'POST', body: { accept }, auth: true });
export const addShortlist    = (unitId) => req('/shortlist', { method: 'POST', body: { unitId }, auth: true });
export const removeShortlist = (unitId) => req(`/shortlist/${encodeURIComponent(unitId)}`, { method: 'DELETE', auth: true });

/** Set of unitIds already shortlisted by the current customer ({} on failure). */
export async function savedUnitIds() {
  try {
    const { items } = await shortlist();
    return new Set((items || []).map((i) => i.unitId).filter(Boolean));
  } catch {
    return new Set();
  }
}

export const activity = () => req('/activity', { auth: true });

// ── Team / workspace (multi-seat) ──
export const team          = ()              => req('/team', { auth: true });
export const inviteMember  = (email, role)   => req('/team/invite', { method: 'POST', body: { email, role }, auth: true });
export const removeMember  = (accountId)     => req(`/team/${encodeURIComponent(accountId)}`, { method: 'DELETE', auth: true });
export const acceptInvite  = (token, name, password) => req('/team/accept', { method: 'POST', body: { token, name, password } });
