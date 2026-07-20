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
// Short labels for the developer's own fixed-template responses (mediation-safe).
const RESP_LABEL = { AVAILABLE: 'Available', TOUR: 'Tour offered', WAITLIST: 'Waitlisted', UNAVAILABLE: 'Unavailable' };

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

  $('#dash-demand').innerHTML = dem.items.length ? dem.items.map((d) => {
    const canRespond = d.type === 'Shortlisted' && d.shortlistId;
    const responded = d.devResponse ? RESP_LABEL[d.devResponse] || d.devResponse : null;
    return `
    <li class="dash-li"${canRespond ? ` data-shortlist="${esc(d.shortlistId)}"` : ''}>
      <div><p class="dash-li-title">${esc(d.label)}</p><p class="dash-li-meta">${esc(fmtDate(d.when))}</p></div>
      <div class="unit-controls">
        <span class="dash-tag ${d.type === 'Site visit' ? 'dash-tag-green' : ''}">${esc(d.type)}</span>
        ${canRespond ? (responded
          ? `<span class="dash-tag dash-tag-green" data-resp-badge>${esc(responded)}</span>`
          : `<select class="resp-pick prop-filter" aria-label="Respond to this interest">
               <option value="">Respond…</option>
               <option value="AVAILABLE">Confirm available</option>
               <option value="TOUR">Offer a tour</option>
               <option value="WAITLIST">Add to waitlist</option>
               <option value="UNAVAILABLE">No longer available</option>
             </select>
             <button type="button" class="btn-ghost btn-sm" data-act="respond">Send</button>`) : ''}
      </div>
    </li>`;
  }).join('') : `<li class="dash-empty">No client interest yet.</li>`;

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
      <button type="button" class="btn-ghost btn-sm" data-act="interest" title="Notify clients who shortlisted this">Express interest</button>
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
  if (act === 'interest') {
    const btn = e.target.closest('[data-act="interest"]'); btn.disabled = true; btn.textContent = 'Sending…';
    try { const r = await dev.expressInterest(li.dataset.unit); toast(r.notified ? `Notified ${r.notified} interested client${r.notified === 1 ? '' : 's'}.` : 'No clients have shortlisted this yet.'); }
    catch (err) { toast(err.message || 'Could not send.', true); }
    finally { btn.disabled = false; btn.textContent = 'Express interest'; }
    return;
  }
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

/* ── respond to anonymised demand (mediation-safe fixed templates) ── */
$('#dash-demand')?.addEventListener('click', async (e) => {
  if (!e.target.closest('[data-act="respond"]')) return;
  const li = e.target.closest('.dash-li[data-shortlist]'); if (!li) return;
  const pick = li.querySelector('.resp-pick');
  const response = pick?.value;
  if (!response) { toast('Pick a response first.', true); return; }
  const btn = e.target.closest('[data-act="respond"]'); btn.disabled = true; btn.textContent = 'Sending…';
  try {
    await dev.respondShortlist(li.dataset.shortlist, response);
    li.querySelector('.unit-controls').innerHTML = `<span class="dash-tag dash-tag-green" data-resp-badge>${esc(RESP_LABEL[response] || response)}</span>`;
    toast('Response sent — BayWorks will relay it to the client.');
  } catch (err) { btn.disabled = false; btn.textContent = 'Send'; toast(err.message || 'Could not send.', true); }
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

/* ── site visit requests (confirm) ──────────────────────────── */
const visitsEl = document.getElementById('dash-visits');
const fmtDT = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); };
async function loadVisits() {
  if (!visitsEl) return;
  let items = [];
  try { items = (await dev.visits()).items; } catch { visitsEl.innerHTML = `<li class="dash-empty">Could not load visits.</li>`; return; }
  visitsEl.innerHTML = items.length ? items.map((v) => `
    <li class="dash-li" data-id="${esc(v.id)}">
      <div><p class="dash-li-title">${esc(v.title)}</p><p class="dash-li-meta">${esc(fmtDT(v.when))} · ${esc(v.status)}</p></div>
      ${v.confirmed ? `<span class="dash-tag dash-tag-green">Confirmed</span>` : `<button type="button" class="btn-primary btn-sm" data-act="confirm">Confirm</button>`}
    </li>`).join('') : `<li class="dash-empty">No site visit requests yet.</li>`;
}
visitsEl?.addEventListener('click', async (e) => {
  const li = e.target.closest('.dash-li[data-id]'); if (!li) return;
  if (e.target.closest('[data-act="confirm"]')) {
    const btn = e.target; btn.disabled = true; btn.textContent = 'Confirming…';
    try { await dev.confirmVisit(li.dataset.id); toast('Visit confirmed — client notified.'); loadVisits(); }
    catch (err) { btn.disabled = false; btn.textContent = 'Confirm'; toast(err.message || 'Could not confirm.', true); }
  }
});
loadVisits();

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
  const showBackup = (codes) => {
    el.innerHTML = `<p class="dash-li-title">Save your backup codes</p><p class="dash-li-meta">Each can be used once if you lose your authenticator.</p><div class="backup-codes">${codes.map((c) => `<code>${esc(c)}</code>`).join('')}</div><div style="display:flex;gap:.6rem;margin-top:.8rem"><button type="button" class="btn-ghost btn-sm" id="bc-copy">Copy</button><button type="button" class="btn-primary btn-sm" data-act="done-codes">I've saved them</button></div>`;
    const cp = document.getElementById('bc-copy'); if (cp) cp.addEventListener('click', () => { navigator.clipboard?.writeText(codes.join('\n')); toast('Backup codes copied.'); });
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
      try { const res = await NS.twoFaEnable(document.getElementById('tf-en-code').value.trim()); toast('Two-factor authentication enabled.'); showBackup(res.backupCodes || []); }
      catch (err) { document.getElementById('tf-en-err').textContent = err.message || 'Invalid code.'; }
    } else if (act === 'done-codes') {
      render(true);
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

/* ── documents vault ────────────────────────────────────────── */
(function initDocs() {
  const NS = dev;
  const el = document.getElementById('dash-documents');
  const fileInput = document.getElementById('doc-file');
  if (!el) return;
  const fmtB = (n) => !n ? '' : n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`;
  const fmtDd = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };
  async function load() {
    let items = [];
    try { items = (await NS.documents()).items; } catch { el.innerHTML = `<li class="dash-empty">Could not load documents.</li>`; return; }
    el.innerHTML = items.length ? items.map((d) => `<li class="dash-li" data-id="${esc(d.id)}"><div><p class="dash-li-title">${esc(d.name)}</p><p class="dash-li-meta">${esc([d.uploadedBy === 'staff' ? 'BayWorks' : 'You', fmtB(d.sizeBytes), fmtDd(d.createdAt)].filter(Boolean).join(' · '))}</p></div><div class="unit-controls"><button type="button" class="btn-ghost btn-sm" data-act="dl">Download</button>${d.uploadedBy !== 'staff' ? `<button type="button" class="btn-ghost btn-sm" data-act="del">Remove</button>` : ''}</div></li>`).join('') : `<li class="dash-empty">No documents yet. Upload KYC, agreements or brochures here.</li>`;
  }
  el.addEventListener('click', async (e) => {
    const li = e.target.closest('.dash-li[data-id]'); if (!li) return;
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'dl') { try { const d = await NS.documentUrl(li.dataset.id); const a = document.createElement('a'); a.href = d.url; a.download = d.name || 'document'; document.body.appendChild(a); a.click(); a.remove(); } catch (err) { toast(err.message || 'Download failed.', true); } }
    else if (act === 'del') { try { await NS.deleteDocument(li.dataset.id); toast('Document removed.'); load(); } catch (err) { toast(err.message || 'Could not remove.', true); } }
  });
  fileInput?.addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 20 * 1024 * 1024) { toast('File too large (max 20 MB).', true); e.target.value = ''; return; }
    const r = new FileReader();
    r.onload = async () => { try { await NS.uploadDocument({ name: f.name, url: r.result, mimeType: f.type }); toast('Document uploaded.'); load(); } catch (err) { toast(err.message || 'Upload failed.', true); } e.target.value = ''; };
    r.readAsDataURL(f);
  });
  load();
})();

/* ── edit profile ───────────────────────────────────────────── */
document.getElementById('prof-edit')?.addEventListener('click', () => {
  const dl = document.getElementById('dash-profile'); const cur = dev.cachedUser() || {};
  dl.innerHTML = `<div class="form-row"><label>Name</label><input id="pf-name" value="${esc(cur.name || '')}" /></div><div class="form-row"><label>Company</label><input id="pf-company" value="${esc(cur.company || '')}" /></div><div class="form-row"><label>Website</label><input id="pf-website" value="${esc(cur.website || '')}" /></div><div style="display:flex;gap:.6rem;margin-top:.6rem"><button type="button" class="btn-primary btn-sm" id="pf-save">Save</button><button type="button" class="btn-ghost btn-sm" id="pf-cancel">Cancel</button></div>`;
  document.getElementById('pf-cancel').addEventListener('click', load);
  document.getElementById('pf-save').addEventListener('click', async () => {
    const b = document.getElementById('pf-save'); b.disabled = true;
    try { await dev.updateMe({ name: document.getElementById('pf-name').value, company: document.getElementById('pf-company').value, website: document.getElementById('pf-website').value }); toast('Profile updated.'); await load(); }
    catch (err) { b.disabled = false; toast(err.message || 'Could not update.', true); }
  });
});

/* ── recent activity ────────────────────────────────────────── */
(async function initActivity() {
  const el = document.getElementById('dash-activity'); if (!el) return;
  const ago = (iso) => { const s = Math.floor((Date.now() - new Date(iso)) / 1000); return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };
  const label = (t) => t.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  try { const { items } = await dev.activity(); el.innerHTML = items.length ? items.map((a) => `<li class="dash-li"><div><p class="dash-li-title">${esc(label(a.type))}</p><p class="dash-li-meta">${esc(a.detail || '')}</p></div><span class="dash-li-meta">${esc(ago(a.createdAt))}</span></li>`).join('') : `<li class="dash-empty">No activity yet.</li>`; }
  catch { el.innerHTML = `<li class="dash-empty">Could not load activity.</li>`; }
})();
