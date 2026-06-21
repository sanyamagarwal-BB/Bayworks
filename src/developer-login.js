/* BAYWORKS — Developer/Landlord login page controller */
import { register, login, isAuthenticated } from './developer-api.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

const params = new URLSearchParams(location.search);
const next = safeNext(params.get('next')) || '/developer-dashboard.html';
if (isAuthenticated()) location.replace(next);

const views = { signin: $('#form-signin'), signup: $('#form-signup') };
const indicator = $('.auth-tab-indicator');

function showView(name) {
  Object.entries(views).forEach(([k, el]) => el.classList.toggle('is-active', k === name));
  $$('.auth-tab').forEach((t) => { const on = t.dataset.view === name; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', String(on)); });
  position(name); clearToast();
  setTimeout(() => views[name]?.querySelector('input')?.focus(), 120);
}
function position(name) {
  const tab = $(`.auth-tab[data-view="${name}"]`);
  if (tab && indicator) { indicator.style.width = tab.offsetWidth + 'px'; indicator.style.transform = `translateX(${tab.offsetLeft}px)`; indicator.style.opacity = '1'; }
}
$$('.auth-tab').forEach((t) => t.addEventListener('click', () => showView(t.dataset.view)));
window.addEventListener('resize', () => position($('.auth-tab.is-active')?.dataset.view || 'signin'));
position('signin');

$$('.pass-toggle').forEach((btn) => btn.addEventListener('click', () => {
  const input = $('#' + btn.dataset.target);
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  $('.eye', btn).style.display = show ? 'none' : '';
  $('.eye-off', btn).style.display = show ? '' : 'none';
}));

function setErr(id, msg) { const el = $(`[data-err="${id}"]`); const i = $('#' + id); if (el) el.textContent = msg || ''; if (i) i.classList.toggle('has-err', !!msg); return !msg; }
function clearErrs(f) { $$('.field-err', f).forEach((e) => (e.textContent = '')); $$('.has-err', f).forEach((i) => i.classList.remove('has-err')); }
const toast = $('#toast'); let tt;
function showToast(m, kind = 'error') { clearTimeout(tt); toast.textContent = m; toast.className = `auth-toast show ${kind}`; if (kind === 'success') tt = setTimeout(clearToast, 4000); }
function clearToast() { toast.className = 'auth-toast'; toast.textContent = ''; }
function busy(btn, on) { btn.classList.toggle('is-busy', on); btn.disabled = on; }

views.signin.addEventListener('submit', async (e) => {
  e.preventDefault(); clearErrs(views.signin);
  const email = $('#si-email').value, pass = $('#si-pass').value;
  let ok = true;
  if (!emailOk(email)) ok = setErr('si-email', 'Enter a valid email.') && ok;
  if (!pass) ok = setErr('si-pass', 'Password is required.') && ok;
  if (!ok) return;
  const btn = $('#si-submit'); busy(btn, true);
  try { await login({ email, password: pass }); showToast('Signed in. Redirecting…', 'success'); setTimeout(() => location.replace(next), 500); }
  catch (err) { showToast(err.message || 'Sign in failed.'); }
  finally { busy(btn, false); }
});

views.signup.addEventListener('submit', async (e) => {
  e.preventDefault(); clearErrs(views.signup);
  const data = { name: $('#su-name').value, company: $('#su-company').value, email: $('#su-email').value, website: $('#su-website').value, password: $('#su-pass').value };
  let ok = true;
  if (!data.name.trim()) ok = setErr('su-name', 'Name is required.') && ok;
  if (!emailOk(data.email)) ok = setErr('su-email', 'Enter a valid email.') && ok;
  if (data.password.length < 8) ok = setErr('su-pass', 'At least 8 characters.') && ok;
  if (!ok) return;
  const btn = $('#su-submit'); busy(btn, true);
  try { await register(data); showToast('Account created. Redirecting…', 'success'); setTimeout(() => location.replace(next), 600); }
  catch (err) { if (err.status === 409) setErr('su-email', err.message); else showToast(err.message || 'Could not create account.'); }
  finally { busy(btn, false); }
});

function safeNext(v) { if (!v) return null; try { const d = decodeURIComponent(v); return d.startsWith('/') && !d.startsWith('//') ? d : null; } catch { return null; } }
