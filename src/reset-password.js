/* BAYWORKS — Reset password page controller */
import { resetPassword } from './portal-api.js';

const $ = (s) => document.querySelector(s);
const token = new URLSearchParams(location.search).get('token') || '';

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
    await resetPassword(token, pass);
    showToast('Password updated. Redirecting to sign in…', 'success');
    setTimeout(() => location.replace('/login.html'), 1200);
  } catch (err) {
    showToast(err.message || 'Could not reset password.');
  } finally { busy(btn, false); }
});
