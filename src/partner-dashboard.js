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

load();
