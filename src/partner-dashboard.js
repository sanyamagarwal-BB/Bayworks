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
