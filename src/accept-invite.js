/* BAYWORKS — Accept-invite page controller.
 * Takes a one-time workspace invite token, collects the new member's name +
 * password, creates their account (joined to the inviter's workspace) and
 * signs them straight into the dashboard. */
import { acceptInvite } from './auth.js';

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

if (!token) showToast('This invitation link is missing its token. Ask your colleague to resend it.');

$('#form-accept').addEventListener('submit', async (e) => {
  e.preventDefault();
  setErr('ai-name', ''); setErr('ai-pass', '');
  const name = $('#ai-name').value.trim(), pass = $('#ai-pass').value;
  let ok = true;
  if (!name) ok = setErr('ai-name', 'Please enter your name.') && ok;
  if (pass.length < 8) ok = setErr('ai-pass', 'At least 8 characters.') && ok;
  if (!ok) return;
  if (!token) return showToast('Missing invitation token.');
  const btn = $('#ai-submit'); busy(btn, true);
  try {
    await acceptInvite(token, name, pass);
    showToast('Welcome aboard. Opening your workspace…', 'success');
    setTimeout(() => location.replace('/dashboard.html'), 1000);
  } catch (err) {
    showToast(err.message || 'Could not accept the invitation.');
  } finally { busy(btn, false); }
});
