/* BAYWORKS — Developer/Landlord dashboard. Auth-guarded; all data live from CRM. */
import * as dev from './developer-api.js';

if (!dev.requireAuth('/developer-login.html')) throw new Error('redirecting');

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };

const cached = dev.cachedUser() || { name: 'Developer' };
const first = (cached.name || 'Developer').split(' ')[0];
$('#dash-firstname').textContent = first;
$('#dash-name').textContent = first;
$('#dash-avatar').textContent = (cached.name || 'D').trim().charAt(0).toUpperCase();
$('#dash-logout').addEventListener('click', () => { dev.logout(); location.href = '/'; });

const STATUS_TONE = { AVAILABLE: 'dash-tag-green' };

async function load() {
  let me, sum, projs, dem;
  try {
    [me, sum, projs, dem] = await Promise.all([dev.me(), dev.summary(), dev.projects(), dev.demand()]);
  } catch {
    $('#dash-stats').innerHTML = `<p class="dash-empty">Could not load your data. Please try again.</p>`;
    return;
  }

  $('#dash-stats').innerHTML = sum.stats.map((s) => `
    <div class="dash-stat"><span class="dash-stat-val">${esc(s.value)}</span><span class="dash-stat-label">${esc(s.label)}</span></div>`).join('');

  $('#dash-projects').innerHTML = projs.items.length ? projs.items.map((p) => `
    <li class="dash-li">
      <div><p class="dash-li-title">${esc(p.name)}</p><p class="dash-li-meta">${esc(p.city || '')}</p></div>
      <span class="dash-tag ${p.available ? 'dash-tag-green' : ''}">${esc(p.available)}/${esc(p.units)} available</span>
    </li>`).join('') : `<li class="dash-empty">No projects yet.</li>`;

  $('#dash-demand').innerHTML = dem.items.length ? dem.items.map((d) => `
    <li class="dash-li">
      <div><p class="dash-li-title">${esc(d.label)}</p><p class="dash-li-meta">${esc(fmtDate(d.when))}</p></div>
      <span class="dash-tag ${d.type === 'Site visit' ? 'dash-tag-green' : ''}">${esc(d.type)}</span>
    </li>`).join('') : `<li class="dash-empty">No client interest yet.</li>`;

  $('#dash-profile').innerHTML = [
    ['Name', me.name], ['Company', me.company || '—'], ['Email', me.email],
    ['Type', me.type || '—'], ['Website', me.website || '—'],
  ].map(([k, v]) => `<div class="dash-prow"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
}

load();
