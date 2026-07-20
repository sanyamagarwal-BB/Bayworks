/* BAYWORKS — Developer/Landlord portal API client + session
 * Talks to the CRM developer-portal endpoints (/crm-api/developer-portal/*).
 */
import { createPortalClient, DEFAULT_CAPTURE_TOKEN } from './lib/portal-client.js';

const CAPTURE_TOKEN = DEFAULT_CAPTURE_TOKEN;
const { ApiError, req, save, logout, cachedUser, isAuthenticated, requireAuth: requireAuthBase } = createPortalClient({
  basePath: '/developer-portal', tokenKey: 'bayworks_developer_token', userKey: 'bayworks_developer_user',
});

export { ApiError, isAuthenticated, cachedUser, logout };

export async function register(d) { return save(await req('/auth/register', { method: 'POST', body: { ...d, token: CAPTURE_TOKEN } })); }
export async function login(d) {
  const { remember, ...body } = d;
  const res = await req('/auth/login', { method: 'POST', body: { ...body, token: CAPTURE_TOKEN } });
  if (res?.twoFactorRequired) return res;
  return save(res, remember);
}
export async function verify2fa(ticket, code, remember) { return save(await req('/auth/2fa', { method: 'POST', body: { ticket, code } }), remember); }
export const forgotPassword = (email) => req('/auth/forgot', { method: 'POST', body: { email, token: CAPTURE_TOKEN } });
export const twoFaStatus  = ()     => req('/2fa/status',  { auth: true });
export const twoFaSetup   = ()     => req('/2fa/setup',   { method: 'POST', auth: true });
export const twoFaEnable  = (code) => req('/2fa/enable',  { method: 'POST', body: { code }, auth: true });
export const twoFaDisable = (code) => req('/2fa/disable', { method: 'POST', body: { code }, auth: true });

export const me       = () => req('/me',       { auth: true });
export const updateMe = (d) => req('/me', { method: 'PATCH', body: d, auth: true });
export const summary  = () => req('/summary',  { auth: true });
export const projects = () => req('/projects', { auth: true });
export const units    = () => req('/units',    { auth: true });
export const demand   = () => req('/demand',   { auth: true });
export const visits   = () => req('/visits',   { auth: true });
export const confirmVisit = (id) => req(`/visits/${encodeURIComponent(id)}/confirm`, { method: 'POST', auth: true });
export const updateUnit = (unitId, patch) => req(`/units/${encodeURIComponent(unitId)}`, { method: 'PATCH', body: patch, auth: true });

export function requireAuth(loginUrl = '/developer-login.html') { return requireAuthBase(loginUrl); }

export const documents      = ()    => req('/documents', { auth: true });
export const documentUrl    = (id)  => req(`/documents/${encodeURIComponent(id)}`, { auth: true });
export const uploadDocument = (doc) => req('/documents', { method: 'POST', body: doc, auth: true });
export const deleteDocument = (id)  => req(`/documents/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true });

export const activity = () => req('/activity', { auth: true });

export const expressInterest = (unitId) => req(`/units/${encodeURIComponent(unitId)}/express-interest`, { method: 'POST', auth: true });
export const respondShortlist = (shortlistId, response) => req(`/demand/${encodeURIComponent(shortlistId)}/respond`, { method: 'POST', body: { response }, auth: true });
