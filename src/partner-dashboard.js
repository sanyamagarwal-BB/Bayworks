/* BAYWORKS — Channel Partner dashboard. Auth-guarded; all data live from CRM. */
import * as partner from './partner-api.js';

if (!partner.requireAuth('/partner-login.html')) throw new Error('redirecting');

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };
const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

const cached = partner.cachedUser() || { name: 'Partner' };
const first = (cached.name || 'Partner').split(' ')[0];
$('#dash-firstname').textContent = first;
$('#dash-name').textContent = first;
$('#dash-avatar').textContent = (cached.name || 'P').trim().charAt(0).toUpperCase();
$('#dash-logout').addEventListener('click', () => { partner.logout(); location.href = '/'; });

const STATUS_TONE = { APPROVED: 'dash-tag-green', PENDING: '', SUSPENDED: '' };
const COMM_TONE = { PAID: 'dash-tag-green', APPROVED: 'dash-tag-green', PENDING: '' };

async function load() {
  let me, sum, lds, comms;
  try {
    [me, sum, lds, comms] = await Promise.all([partner.me(), partner.summary(), partner.leads(), partner.commissions()]);
  } catch (e) {
    $('#dash-stats').innerHTML = `<p class="dash-empty">Could not load your data. Please try again.</p>`;
    return;
  }

  // status chip
  const statusEl = $('#dash-status');
  statusEl.textContent = me.status || '';
  statusEl.className = `dash-tag ${STATUS_TONE[me.status] || ''}`;

  $('#dash-stats').innerHTML = sum.stats.map((s) => `
    <div class="dash-stat"><span class="dash-stat-val">${esc(s.value)}</span><span class="dash-stat-label">${esc(s.label)}</span></div>`).join('');

  $('#dash-leads').innerHTML = lds.items.length ? lds.items.map((l) => `
    <li class="dash-li">
      <div><p class="dash-li-title">${esc(l.name || 'Lead')}</p><p class="dash-li-meta">${esc([l.city, fmtDate(l.createdAt)].filter(Boolean).join(' · '))}</p></div>
      <span class="dash-tag">${esc(l.status || 'NEW')}</span>
    </li>`).join('') : `<li class="dash-empty">No referred leads yet.</li>`;

  $('#dash-commissions').innerHTML = comms.items.length ? comms.items.map((c) => `
    <li class="dash-li">
      <div><p class="dash-li-title">${inr(c.amount)}</p><p class="dash-li-meta">${esc(fmtDate(c.createdAt))}</p></div>
      <span class="dash-tag ${COMM_TONE[c.status] || ''}">${esc(c.status)}</span>
    </li>`).join('') : `<li class="dash-empty">No commissions yet.</li>`;

  $('#dash-profile').innerHTML = [
    ['Name', me.name], ['Company', me.company || '—'], ['Email', me.email],
    ['Phone', me.phone || '—'], ['Commission', me.commissionPct ? `${me.commissionPct}%` : '—'], ['Status', me.status],
  ].map(([k, v]) => `<div class="dash-prow"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
}

/* ── refer a lead ───────────────────────────────────────────── */
const $f = (id) => document.getElementById(id);
const form = $f('refer-form');
$f('refer-toggle').addEventListener('click', () => {
  form.hidden = !form.hidden;
  if (!form.hidden) $f('rl-name').focus();
});
$f('rl-cancel').addEventListener('click', () => { form.hidden = true; form.reset(); $f('rl-err').textContent = ''; });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  $f('rl-err').textContent = '';
  const data = {
    name: $f('rl-name').value.trim(), city: $f('rl-city').value.trim(),
    email: $f('rl-email').value.trim(), phone: $f('rl-phone').value.trim(),
    budget: $f('rl-budget').value.trim(),
  };
  if (!data.name) { $f('rl-err').textContent = 'Name is required.'; return; }
  if (!data.email && !data.phone) { $f('rl-err').textContent = 'Provide an email or phone.'; return; }
  const btn = $f('rl-submit'); btn.disabled = true; btn.textContent = 'Submitting…';
  try {
    await partner.referLead(data);
    form.reset(); form.hidden = true;
    toast('Lead referred — it is now in the BayWorks pipeline.');
    await load(); // refresh stats + leads list
  } catch (err) {
    $f('rl-err').textContent = err.message || 'Could not submit referral.';
  } finally {
    btn.disabled = false; btn.textContent = 'Submit referral';
  }
});

let toastTimer;
function toast(msg, isErr = false) {
  let t = document.getElementById('p-toast');
  if (!t) { t = document.createElement('div'); t.id = 'p-toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.style.cssText = `position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2000;padding:.7rem 1.1rem;border-radius:8px;font-family:var(--font-head);font-size:.85rem;font-weight:600;box-shadow:0 8px 24px rgba(15,23,42,.18);background:${isErr ? '#FEF2F2' : 'var(--green-light)'};color:${isErr ? '#B91C1C' : 'var(--green-darker)'};border:1px solid ${isErr ? '#FECACA' : 'var(--green-border)'}`;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 3500);
}

load();

import { initBell } from './notify-bell.js';
initBell({ basePath: '/partner-portal', tokenKey: 'bayworks_partner_token' });

/* ── security / 2FA ─────────────────────────────────────────── */
(function initSecurity() {
  const NS = partner;
  const card = document.getElementById('dash-security-card');
  const el = document.getElementById('dash-2fa');
  if (!card || !el) return;
  const render = (enabled) => {
    el.innerHTML = enabled
      ? `<div class="sec-row"><div><p class="dash-li-title">Two-factor authentication</p><p class="dash-li-meta">Enabled — a code is required at sign-in</p></div><span class="dash-tag dash-tag-green">ON</span></div><button type="button" class="btn-ghost btn-sm" data-act="disable" style="margin-top:.8rem">Disable 2FA</button>`
      : `<div class="sec-row"><div><p class="dash-li-title">Two-factor authentication</p><p class="dash-li-meta">Add an authenticator app for extra security</p></div><span class="dash-tag">OFF</span></div><button type="button" class="btn-primary btn-sm" data-act="enable" style="margin-top:.8rem">Enable 2FA</button>`;
  };
  el.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act; if (!act) return;
    if (act === 'enable') {
      el.innerHTML = `<p class="dash-li-meta">Generating…</p>`;
      try { const s = await NS.twoFaSetup();
        el.innerHTML = `<p class="dash-li-meta">Scan with Google Authenticator or Authy, then enter the 6-digit code.</p>
          <img src="${s.qr}" alt="2FA QR" style="width:160px;height:160px;margin:.6rem 0;border:1px solid var(--gray-200);border-radius:8px" />
          <p class="dash-li-meta" style="word-break:break-all">Manual key: <code>${esc(s.secret)}</code></p>
          <div style="display:flex;gap:.5rem;margin-top:.6rem"><input id="tf-en-code" class="prop-filter" inputmode="numeric" maxlength="6" placeholder="123456" style="width:130px" /><button type="button" class="btn-primary btn-sm" data-act="confirm-enable">Verify &amp; enable</button></div><p class="field-err" id="tf-en-err"></p>`;
      } catch { el.innerHTML = `<p class="dash-empty">Could not start setup.</p>`; }
    } else if (act === 'confirm-enable') {
      try { await NS.twoFaEnable(document.getElementById('tf-en-code').value.trim()); toast('Two-factor authentication enabled.'); render(true); }
      catch (err) { document.getElementById('tf-en-err').textContent = err.message || 'Invalid code.'; }
    } else if (act === 'disable') {
      el.innerHTML = `<p class="dash-li-meta">Enter a current code to turn off 2FA.</p><div style="display:flex;gap:.5rem;margin-top:.6rem"><input id="tf-dis-code" class="prop-filter" inputmode="numeric" maxlength="6" placeholder="123456" style="width:130px" /><button type="button" class="btn-ghost btn-sm" data-act="confirm-disable">Disable</button></div><p class="field-err" id="tf-dis-err"></p>`;
    } else if (act === 'confirm-disable') {
      try { await NS.twoFaDisable(document.getElementById('tf-dis-code').value.trim()); toast('Two-factor authentication disabled.'); render(false); }
      catch (err) { document.getElementById('tf-dis-err').textContent = err.message || 'Invalid code.'; }
    }
  });
  card.hidden = false;
  NS.twoFaStatus().then((s) => render(s.enabled)).catch(() => { el.innerHTML = `<p class="dash-empty">Could not load security settings.</p>`; });
})();
