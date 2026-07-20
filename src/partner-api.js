/* BAYWORKS — Channel Partner portal API client + session
 * Talks to the CRM partner-portal endpoints (/crm-api/partner-portal/*).
 * Self-contained session (token + cached user in localStorage). No offline
 * fallback — the partner portal requires the CRM (it's all live CRM data).
 */
import { createPortalClient, DEFAULT_CAPTURE_TOKEN } from './lib/portal-client.js';

const CAPTURE_TOKEN = DEFAULT_CAPTURE_TOKEN;
const { ApiError, req, reqText, save, logout, cachedUser, isAuthenticated, requireAuth: requireAuthBase } = createPortalClient({
  basePath: '/partner-portal', tokenKey: 'bayworks_partner_token', userKey: 'bayworks_partner_user',
});

export { ApiError, isAuthenticated, cachedUser, logout };

export async function register(d) { return save(await req('/auth/register', { method: 'POST', body: { ...d, token: CAPTURE_TOKEN } })); }
export async function login(d) {
  const { remember, ...body } = d;
  const res = await req('/auth/login', { method: 'POST', body: { ...body, token: CAPTURE_TOKEN } });
  if (res?.twoFactorRequired) return res;           // needs a 2FA code; don't save yet
  return save(res, remember);
}
export async function verify2fa(ticket, code, remember) { return save(await req('/auth/2fa', { method: 'POST', body: { ticket, code } }), remember); }
export const forgotPassword = (email) => req('/auth/forgot', { method: 'POST', body: { email, token: CAPTURE_TOKEN } });
export const twoFaStatus  = ()     => req('/2fa/status',  { auth: true });
export const twoFaSetup   = ()     => req('/2fa/setup',   { method: 'POST', auth: true });
export const twoFaEnable  = (code) => req('/2fa/enable',  { method: 'POST', body: { code }, auth: true });
export const twoFaDisable = (code) => req('/2fa/disable', { method: 'POST', body: { code }, auth: true });

export const me          = () => req('/me',          { auth: true });
export const updateMe    = (d) => req('/me', { method: 'PATCH', body: d, auth: true });
export const summary     = () => req('/summary',     { auth: true });
export const leads       = () => req('/leads',       { auth: true });
export const referLead   = (d) => req('/leads',      { method: 'POST', body: d, auth: true });
export const commissions = () => req('/commissions', { auth: true });
export const commissionStatement = () => reqText('/commissions/statement');

/** Guard a partner page: redirect to login (with ?next=) if not signed in. */
export function requireAuth(loginUrl = '/partner-login.html') { return requireAuthBase(loginUrl); }

export const documents      = ()    => req('/documents', { auth: true });
export const documentUrl    = (id)  => req(`/documents/${encodeURIComponent(id)}`, { auth: true });
export const uploadDocument = (doc) => req('/documents', { method: 'POST', body: doc, auth: true });
export const deleteDocument = (id)  => req(`/documents/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true });

export const activity = () => req('/activity', { auth: true });
