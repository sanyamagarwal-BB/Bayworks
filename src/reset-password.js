/* BAYWORKS — Reset password page controller (audience-aware: customer/partner/developer) */
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const BASE = env.VITE_CRM_BASE || '/crm-api';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const token = params.get('token') || '';
const aud = (params.get('aud') || 'customer').toLowerCase();

const PATHS = { customer: '/portal', partner: '/partner-portal', developer: '/developer-portal' };
const LOGINS = { customer: '/login.html', partner: '/partner-login.html', developer: '/developer-login.html' };
const basePath = PATHS[aud] || PATHS.customer;
const loginUrl = LOGINS[aud] || LOGINS.customer;

const toast = $('#toast');
function showToast(m, kind = 'error') { toast.textContent = m; toast.className = `auth-toast show ${kind}`; }
function setErr(id, msg) { const el = $(`[data-err="${id}"]`); const i = $('#' + id); if (el) el.textContent = msg || ''; if (i) i.classList.toggle('has-err', !!msg); return !msg; }
function busy(btn, on) { btn.classList.toggle('is-busy', on); btn.disabled = on; }

$('.pass-toggle').addEventListener('click', (e) => {
  const btn = e.currentTarget; const input = $('#' + btn.dataset.target);
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  $('.eye', btn).style.display = show ? 'none' : '';
  $('.eye-off', btn).style.display = show ? '' : 'none';
});

if (!token) showToast('This reset link is missing its token. Please request a new one.');

async function doReset(password) {
  const res = await fetch(`${BASE}${basePath}/auth/reset`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && (Array.isArray(data.message) ? data.message[0] : data.message)) || 'Reset failed');
  return data;
}

$('#form-reset').addEventListener('submit', async (e) => {
  e.preventDefault();
  setErr('rp-pass', ''); setErr('rp-pass2', '');
  const pass = $('#rp-pass').value, pass2 = $('#rp-pass2').value;
  let ok = true;
  if (pass.length < 8) ok = setErr('rp-pass', 'At least 8 characters.') && ok;
  if (pass !== pass2) ok = setErr('rp-pass2', 'Passwords do not match.') && ok;
  if (!ok) return;
  if (!token) return showToast('Missing reset token.');
  const btn = $('#rp-submit'); busy(btn, true);
  try {
    await doReset(pass);
    showToast('Password updated. Redirecting to sign in…', 'success');
    setTimeout(() => location.replace(loginUrl), 1200);
  } catch (err) {
    showToast(err.message || 'Could not reset password.');
  } finally { busy(btn, false); }
});
