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
  let me, sum, projs, dem, unts;
  try {
    [me, sum, projs, dem, unts] = await Promise.all([dev.me(), dev.summary(), dev.projects(), dev.demand(), dev.units()]);
  } catch {
    $('#dash-stats').innerHTML = `<p class="dash-empty">Could not load your data. Please try again.</p>`;
    return;
  }
  renderUnits(unts.items);

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

/* ── editable units ─────────────────────────────────────────── */
const STATUS_TONE_UNIT = { AVAILABLE: 'dash-tag-green' };

function unitRow(u) {
  return `<li class="dash-li" data-unit="${esc(u.id)}" data-rent="${u.rentPerSqft ?? ''}" data-status="${esc(u.status)}">
    <div><p class="dash-li-title">${esc(u.name)}</p><p class="dash-li-meta">${esc([u.city, u.area].filter(Boolean).join(' · '))}</p></div>
    <div class="unit-controls">
      <span class="unit-rate">${esc(u.rate || '—')}</span>
      <span class="dash-tag ${STATUS_TONE_UNIT[u.status] || ''}">${esc(u.status)}</span>
      <button type="button" class="btn-ghost btn-sm" data-act="edit">Edit</button>
    </div>
  </li>`;
}

function renderUnits(items) {
  const el = $('#dash-units');
  el.innerHTML = items.length ? items.map(unitRow).join('') : `<li class="dash-empty">No units yet.</li>`;
}

function editForm(li) {
  const rent = li.dataset.rent, status = li.dataset.status;
  const ctrls = li.querySelector('.unit-controls');
  ctrls.innerHTML = `
    <select class="unit-status prop-filter" aria-label="Availability">
      <option value="AVAILABLE"${status === 'AVAILABLE' ? ' selected' : ''}>Available</option>
      <option value="BLOCKED"${status === 'BLOCKED' ? ' selected' : ''}>Blocked</option>
    </select>
    <input class="unit-rent prop-filter" type="number" min="0" step="1" placeholder="Rent ₹/sqft" value="${rent}" style="width:120px" />
    <button type="button" class="btn-primary btn-sm" data-act="save">Save</button>
    <button type="button" class="btn-ghost btn-sm" data-act="cancel">Cancel</button>`;
}

$('#dash-units').addEventListener('click', async (e) => {
  const li = e.target.closest('.dash-li[data-unit]');
  if (!li) return;
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'edit') return editForm(li);
  if (act === 'cancel') return load();
  if (act === 'save') {
    const status = li.querySelector('.unit-status').value;
    const rentRaw = li.querySelector('.unit-rent').value.trim();
    const patch = { status };
    if (rentRaw !== '') patch.rentPerSqft = Number(rentRaw);
    const btn = e.target.closest('[data-act="save"]');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const u = await dev.updateUnit(li.dataset.unit, patch);
      li.outerHTML = unitRow(u);
      toast('Unit updated — live on the site.');
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Save';
      toast(err.message || 'Update failed.', true);
    }
  }
});

let toastTimer;
function toast(msg, isErr = false) {
  let t = document.getElementById('dev-toast');
  if (!t) { t = document.createElement('div'); t.id = 'dev-toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.style.cssText = `position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2000;padding:.7rem 1.1rem;border-radius:8px;font-family:var(--font-head);font-size:.85rem;font-weight:600;box-shadow:0 8px 24px rgba(15,23,42,.18);background:${isErr ? '#FEF2F2' : 'var(--green-light)'};color:${isErr ? '#B91C1C' : 'var(--green-darker)'};border:1px solid ${isErr ? '#FECACA' : 'var(--green-border)'}`;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 3500);
}

load();

import { initBell } from './notify-bell.js';
initBell({ basePath: '/developer-portal', tokenKey: 'bayworks_developer_token' });

/* ── security / 2FA ─────────────────────────────────────────── */
(function initSecurity() {
  const NS = dev;
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
