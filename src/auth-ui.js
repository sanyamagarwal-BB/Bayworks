/* BAYWORKS — Customer portal login page controller
 * Wires login.html to the auth.js core: view switching, validation,
 * password meter/toggle, submit handling, toasts, and post-login redirect.
 */
import {
  register, login, verify2fa, requestReset, isAuthenticated,
  validators, passwordStrength,
} from './auth.js';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* If already signed in, skip straight to the destination. */
const params  = new URLSearchParams(location.search);
const nextUrl = safeNext(params.get('next')) || '/dashboard.html';
if (isAuthenticated()) location.replace(nextUrl);

/* ── view switching ─────────────────────────────────────────── */
const views = {
  signin: $('#form-signin'),
  signup: $('#form-signup'),
  forgot: $('#form-forgot'),
  twofa: $('#form-2fa'),
};
let pending2fa = null; // { ticket, remember }
const indicator = $('.auth-tab-indicator');

function showView(name) {
  Object.entries(views).forEach(([k, el]) => el.classList.toggle('is-active', k === name));
  // Tabs only reflect the two primary views; "forgot" leaves both inactive.
  $$('.auth-tab').forEach(t => {
    const on = t.dataset.view === name;
    t.classList.toggle('is-active', on);
    t.setAttribute('aria-selected', String(on));
  });
  positionIndicator(name);
  clearToast();
  const first = views[name]?.querySelector('input');
  if (first) setTimeout(() => first.focus(), 120);
}

function positionIndicator(name) {
  const tab = $(`.auth-tab[data-view="${name}"]`);
  if (tab && indicator) {
    indicator.style.width = tab.offsetWidth + 'px';
    indicator.style.transform = `translateX(${tab.offsetLeft}px)`;
    indicator.style.opacity = '1';
  } else if (indicator) {
    indicator.style.opacity = '0'; // forgot view: hide the pill
  }
}

$$('[data-view]').forEach(el => el.addEventListener('click', () => showView(el.dataset.view)));
window.addEventListener('resize', () => positionIndicator($('.auth-tab.is-active')?.dataset.view || 'signin'));
positionIndicator('signin');

/* ── password show/hide ─────────────────────────────────────── */
$$('.pass-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = $('#' + btn.dataset.target);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    $('.eye', btn).style.display     = show ? 'none' : '';
    $('.eye-off', btn).style.display = show ? '' : 'none';
  });
});

/* ── password strength meter ────────────────────────────────── */
const meter = $('#su-meter');
$('#su-pass').addEventListener('input', (e) => {
  const { score } = passwordStrength(e.target.value);
  meter.dataset.score = String(score);
  $$('span', meter).forEach((bar, i) => bar.classList.toggle('on', i < score));
});

/* ── field error helpers ────────────────────────────────────── */
function setErr(id, msg) {
  const el = $(`[data-err="${id}"]`);
  const input = $('#' + id);
  if (el) el.textContent = msg || '';
  if (input) input.classList.toggle('has-err', !!msg);
  return !msg;
}
function clearErrs(form) { $$('.field-err', form).forEach(e => e.textContent = ''); $$('.has-err', form).forEach(i => i.classList.remove('has-err')); }

/* ── toast ──────────────────────────────────────────────────── */
const toast = $('#toast');
let toastTimer;
function showToast(msg, kind = 'error') {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className = `auth-toast show ${kind}`;
  if (kind === 'success') toastTimer = setTimeout(clearToast, 4000);
}
function clearToast() { toast.className = 'auth-toast'; toast.textContent = ''; }

/* ── busy state on submit buttons ───────────────────────────── */
function setBusy(btn, busy) {
  btn.classList.toggle('is-busy', busy);
  btn.disabled = busy;
}

/* ── SIGN IN ────────────────────────────────────────────────── */
views.signin.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrs(views.signin);
  const email = $('#si-email').value;
  const pass  = $('#si-pass').value;
  let ok = true;
  if (!validators.email(email)) ok = setErr('si-email', 'Enter a valid email.') && ok;
  if (!validators.required(pass)) ok = setErr('si-pass', 'Password is required.') && ok;
  if (!ok) return;

  const btn = $('#si-submit');
  setBusy(btn, true);
  try {
    const remember = $('#si-remember').checked;
    const res = await login({ email, password: pass, remember });
    if (res.twoFactorRequired) {
      pending2fa = { ticket: res.ticket, remember };
      showView('twofa');
      return;
    }
    showToast('Signed in. Redirecting…', 'success');
    setTimeout(() => location.replace(nextUrl), 500);
  } catch (err) {
    showToast(err.message || 'Sign in failed.');
  } finally { setBusy(btn, false); }
});

/* ── 2FA verify ─────────────────────────────────────────────── */
views.twofa.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrs(views.twofa);
  const code = $('#tf-code').value.trim();
  if (!/^\d{6}$/.test(code)) return setErr('tf-code', 'Enter the 6-digit code.');
  if (!pending2fa) { showView('signin'); return; }
  const btn = $('#tf-submit');
  setBusy(btn, true);
  try {
    await verify2fa(pending2fa.ticket, code, pending2fa.remember);
    showToast('Signed in. Redirecting…', 'success');
    setTimeout(() => location.replace(nextUrl), 500);
  } catch (err) {
    setErr('tf-code', err.message || 'Invalid code.');
  } finally { setBusy(btn, false); }
});

/* ── SIGN UP ────────────────────────────────────────────────── */
views.signup.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrs(views.signup);
  const data = {
    name: $('#su-name').value, company: $('#su-company').value,
    email: $('#su-email').value, phone: $('#su-phone').value,
    password: $('#su-pass').value,
  };
  const pass2 = $('#su-pass2').value;

  let ok = true;
  if (!validators.required(data.name)) ok = setErr('su-name', 'Name is required.') && ok;
  if (!validators.email(data.email))   ok = setErr('su-email', 'Enter a valid email.') && ok;
  if (data.phone && !validators.phone(data.phone)) ok = setErr('su-phone', 'Enter a valid phone number.') && ok;
  if (passwordStrength(data.password).score < 2)
    ok = setErr('su-pass', 'Password is too weak — add length, a number or a symbol.') && ok;
  if (data.password !== pass2) ok = setErr('su-pass2', 'Passwords do not match.') && ok;
  if (!$('#su-terms').checked) { ok = false; showToast('Please accept the Terms to continue.'); }
  if (!ok) return;

  const btn = $('#su-submit');
  setBusy(btn, true);
  try {
    await register(data);
    await login({ email: data.email, password: data.password, remember: true });
    showToast('Account created. Redirecting…', 'success');
    setTimeout(() => location.replace(nextUrl), 600);
  } catch (err) {
    if (err.code === 'EXISTS') { setErr('su-email', err.message); showView('signup'); }
    else showToast(err.message || 'Could not create account.');
  } finally { setBusy(btn, false); }
});

/* ── FORGOT ─────────────────────────────────────────────────── */
views.forgot.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrs(views.forgot);
  const email = $('#fp-email').value;
  if (!validators.email(email)) return setErr('fp-email', 'Enter a valid email.');
  const btn = $('#fp-submit');
  setBusy(btn, true);
  try {
    await requestReset(email);
    showToast('If that email is registered, a reset link is on its way.', 'success');
    views.forgot.reset();
  } finally { setBusy(btn, false); }
});

/* ── Demo account quick-fill ────────────────────────────────── */
$('#si-demo')?.addEventListener('click', () => {
  $('#si-email').value = 'demo@bayworks.in';
  $('#si-pass').value = 'Demo@1234';
  $('#si-pass').focus();
  showToast('Demo credentials filled — press Sign In.', 'info');
});

/* ── Google placeholder ─────────────────────────────────────── */
$('#si-google').addEventListener('click', () =>
  showToast('Social sign-in is coming soon. Please use email for now.', 'info'));

/* Only allow same-origin relative redirects (open-redirect guard). */
function safeNext(v) {
  if (!v) return null;
  try { const dec = decodeURIComponent(v); return dec.startsWith('/') && !dec.startsWith('//') ? dec : null; }
  catch { return null; }
}
