/* BAYWORKS — Customer portal dashboard
 * Auth-guarded landing page after login. Renders the signed-in customer's
 * overview: stats, shortlisted spaces, requirements, site visits, profile.
 *
 * Data: when the session is API-backed (CRM up), data is fetched live and
 * scoped to this customer's lead. Otherwise (demo/offline) it shows mock data.
 * Any API failure mid-session also degrades to mock so the page never breaks.
 */
import { requireAuth, getCurrentUser, logout, isApiSession, setCachedUser } from './auth.js';
import * as portal from './portal-api.js';

// Block render until authenticated. requireAuth() redirects (with ?next=) when
// logged out; we simply stop here without throwing so the console stays clean.
requireAuth('/login.html');

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const user = getCurrentUser() || { name: 'Client', email: '' };
const first = (user.name || 'there').split(' ')[0];

/* ── header / identity ──────────────────────────────────────── */
$('#dash-firstname').textContent = first;
$('#dash-name').textContent = first;
$('#dash-avatar').textContent = (user.name || user.email || '?').trim().charAt(0).toUpperCase();
$('#dash-logout').addEventListener('click', () => { logout(); location.href = '/'; });

/* ── profile (from session, editable on API sessions) ───────── */
let prof = { ...user };
function renderProfile(u) {
  $('#dash-profile').innerHTML = [
    ['Name', u.name], ['Company', u.company || '—'], ['Email', u.email], ['Phone', u.phone || '—'],
  ].map(([k, v]) => `<div class="dash-prow"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
}
renderProfile(prof);
const profEditBtn = $('#prof-edit');
if (profEditBtn && !isApiSession()) profEditBtn.style.display = 'none';
profEditBtn?.addEventListener('click', () => {
  const dl = $('#dash-profile');
  dl.innerHTML = `
    <div class="form-row"><label>Name</label><input id="pf-name" value="${esc(prof.name || '')}" /></div>
    <div class="form-row"><label>Company</label><input id="pf-company" value="${esc(prof.company || '')}" /></div>
    <div class="form-row"><label>Phone</label><input id="pf-phone" value="${esc(prof.phone || '')}" /></div>
    <div style="display:flex;gap:.6rem;margin-top:.6rem"><button type="button" class="btn-primary btn-sm" id="pf-save">Save</button><button type="button" class="btn-ghost btn-sm" id="pf-cancel">Cancel</button></div>`;
  $('#pf-cancel').addEventListener('click', () => renderProfile(prof));
  $('#pf-save').addEventListener('click', async () => {
    const btn = $('#pf-save'); btn.disabled = true;
    try {
      prof = await portal.updateMe({ name: $('#pf-name').value, company: $('#pf-company').value, phone: $('#pf-phone').value });
      setCachedUser(prof); renderProfile(prof);
      $('#dash-name').textContent = (prof.name || 'there').split(' ')[0];
      toast('Profile updated.');
    } catch (err) { btn.disabled = false; toast(err.message || 'Could not update profile.', true); }
  });
});

/* ── mock data (demo / offline / API failure fallback) ──────── */
const MOCK = {
  stats: [
    { label: 'Active requirements', value: 2 },
    { label: 'Shortlisted spaces', value: 3 },
    { label: 'Scheduled visits', value: 1 },
    { label: 'Proposals received', value: 1 },
  ],
  shortlist: [
    { name: 'Prestige Tech Park — Tower B', city: 'Bengaluru', meta: '40 seats', rate: '₹95/sq.ft', img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=70&auto=format&fit=crop' },
    { name: 'One BKC — 14th Floor', city: 'Mumbai', meta: '60 seats', rate: '₹160/sq.ft', img: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&q=70&auto=format&fit=crop' },
    { name: 'Cyber Hub — Block C', city: 'Gurugram', meta: '25 seats', rate: '₹110/sq.ft', img: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600&q=70&auto=format&fit=crop' },
  ],
  requirements: [
    { title: '40–50 managed seats, Bengaluru', status: 'In progress', meta: 'Updated 2 days ago' },
    { title: 'HQ relocation, Mumbai BKC', status: 'Sourcing', meta: 'Updated 5 days ago' },
  ],
  visits: [
    { title: 'Prestige Tech Park — Tower B', when: 'Tue, 24 Jun · 11:00 AM', meta: 'With your advisor' },
  ],
};

const fmtVisit = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? String(iso) : d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

/** Fetch live, customer-scoped data; fall back to MOCK on any failure. */
async function loadPortalData() {
  if (!isApiSession()) return MOCK;
  try {
    const [s, r, sl, v] = await Promise.all([
      portal.summary(), portal.requirement(), portal.shortlist(), portal.visits(),
    ]);
    return {
      stats: s.stats,
      shortlist: sl.items.map((p) => ({ unitId: p.unitId, name: p.name, city: p.city, meta: p.meta, rate: p.rate, img: '' })),
      requirements: r.items,
      visits: v.items.map((x) => ({ title: x.title, when: fmtVisit(x.when), meta: x.confirmed ? 'Confirmed' : x.status })),
    };
  } catch {
    return MOCK; // CRM down or session invalid → never break the page
  }
}

/* ── render ─────────────────────────────────────────────────── */
function render(data) {
  $('#dash-stats').innerHTML = data.stats.map((s) => `
    <div class="dash-stat">
      <span class="dash-stat-val">${esc(s.value)}</span>
      <span class="dash-stat-label">${esc(s.label)}</span>
    </div>`).join('');

  $('#dash-shortlist').innerHTML = data.shortlist.length ? data.shortlist.map((p) => `
    <article class="dash-prop"${p.unitId ? ` data-unit="${esc(p.unitId)}"` : ''}>
      <div class="dash-prop-img"${p.img ? ` style="background-image:url('${esc(p.img)}')"` : ''}></div>
      <div class="dash-prop-body">
        <h3>${esc(p.name)}</h3>
        <p class="dash-prop-meta">${esc([p.city, p.meta].filter(Boolean).join(' · '))}</p>
        <p class="dash-prop-rate">${esc(p.rate)}</p>
        ${p.unitId && isApiSession() ? `<div class="dash-prop-book">
          <input type="datetime-local" class="book-when" aria-label="Visit date and time" />
          <button type="button" class="btn-primary btn-sm" data-act="book">Book visit</button>
        </div>` : ''}
      </div>
    </article>`).join('') : `<p class="dash-empty">No shortlisted spaces yet. <a href="/properties.html" class="auth-link">Browse properties</a></p>`;

  $('#dash-reqs').innerHTML = data.requirements.length ? data.requirements.map((r) => `
    <li class="dash-li">
      <div>
        <p class="dash-li-title">${esc(r.title)}</p>
        <p class="dash-li-meta">${esc(r.meta)}</p>
      </div>
      <span class="dash-tag">${esc(r.status)}</span>
    </li>`).join('') : `<li class="dash-empty">No active requirements yet.</li>`;

  $('#dash-visits').innerHTML = data.visits.length ? data.visits.map((v) => `
    <li class="dash-li">
      <div>
        <p class="dash-li-title">${esc(v.title)}</p>
        <p class="dash-li-meta">${esc(v.meta)}</p>
      </div>
      <span class="dash-tag dash-tag-green">${esc(v.when)}</span>
    </li>`).join('') : `<li class="dash-empty">No visits scheduled yet.</li>`;
}

/* ── book a visit from a shortlisted unit ───────────────────── */
$('#dash-shortlist').addEventListener('click', async (e) => {
  if (e.target.closest('[data-act="book"]') === null) return;
  const card = e.target.closest('.dash-prop[data-unit]');
  if (!card) return;
  const when = card.querySelector('.book-when').value;
  if (!when) { toast('Pick a date and time first.', true); return; }
  const btn = e.target.closest('[data-act="book"]');
  btn.disabled = true; btn.textContent = 'Booking…';
  try {
    await portal.bookVisit({ unitId: card.dataset.unit, when: new Date(when).toISOString() });
    toast('Site visit requested. Your advisor will confirm.');
    render(await loadPortalData()); // refresh visits + stats
  } catch (err) {
    btn.disabled = false; btn.textContent = 'Book visit';
    toast(err.message || 'Could not book the visit.', true);
  }
});

let toastTimer;
function toast(msg, isErr = false) {
  let t = document.getElementById('c-toast');
  if (!t) { t = document.createElement('div'); t.id = 'c-toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.style.cssText = `position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2000;padding:.7rem 1.1rem;border-radius:8px;font-family:var(--font-head);font-size:.85rem;font-weight:600;box-shadow:0 8px 24px rgba(15,23,42,.18);background:${isErr ? '#FEF2F2' : 'var(--green-light)'};color:${isErr ? '#B91C1C' : 'var(--green-darker)'};border:1px solid ${isErr ? '#FECACA' : 'var(--green-border)'}`;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 3500);
}

loadPortalData().then(render);

/* ── proposals / quotes ─────────────────────────────────────── */
const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const PSTATUS = { ACCEPTED: 'dash-tag-green' };
const propsEl = $('#dash-proposals');

async function loadProposals() {
  if (!isApiSession()) { propsEl.innerHTML = `<p class="dash-empty">No proposals yet.</p>`; return; }
  let items = [];
  try { items = (await portal.proposals()).items; } catch { propsEl.innerHTML = `<p class="dash-empty">Could not load proposals.</p>`; return; }
  propsEl.innerHTML = items.length ? items.map((q) => `
    <div class="prop-row" data-id="${esc(q.id)}" data-status="${esc(q.status)}">
      <div class="prop-row-head">
        <div><p class="dash-li-title">${esc(q.projectName || q.number)}</p><p class="dash-li-meta">${esc([q.unitCode, q.number].filter(Boolean).join(' · '))}</p></div>
        <div class="prop-side">
          <span class="prop-monthly">${inr(q.monthlyTotal)}/mo</span>
          <span class="dash-tag ${PSTATUS[q.status] || ''}">${esc(q.status)}</span>
          <button type="button" class="btn-ghost btn-sm" data-act="toggle">View</button>
        </div>
      </div>
      <div class="prop-detail" hidden></div>
    </div>`).join('') : `<p class="dash-empty">No proposals yet. Your advisor will share options here.</p>`;
}

propsEl.addEventListener('click', async (e) => {
  const row = e.target.closest('.prop-row'); if (!row) return;
  const act = e.target.closest('[data-act]')?.dataset.act;
  const detail = row.querySelector('.prop-detail');
  if (act === 'toggle') {
    const btn = e.target.closest('[data-act="toggle"]');
    if (!detail.hidden) { detail.hidden = true; btn.textContent = 'View'; return; }
    detail.innerHTML = `<p class="dash-li-meta">Loading…</p>`; detail.hidden = false; btn.textContent = 'Hide';
    try {
      const q = await portal.proposal(row.dataset.id);
      const items = Array.isArray(q.items) ? q.items : [];
      const canRespond = ['SENT', 'VIEWED'].includes(q.status);
      detail.innerHTML = `
        ${items.length ? `<table class="prop-table">${items.map((i) => `<tr><td>${esc(i.label)}${i.detail ? `<span>${esc(i.detail)}</span>` : ''}</td><td>${esc(i.amount != null ? inr(i.amount) : '')}</td></tr>`).join('')}</table>` : ''}
        <div class="prop-terms">
          <span>Monthly <b>${inr(q.monthlyTotal)}</b></span><span>Annual <b>${inr(q.annualTotal)}</b></span>
          <span>Deposit <b>${inr(q.deposit)}</b></span><span>Move-in <b>${inr(q.moveInCost)}</b></span>
          <span>Term <b>${esc(q.termMonths)}m</b></span>${q.escalationPct ? `<span>Escalation <b>${esc(q.escalationPct)}%</b></span>` : ''}
        </div>
        ${q.inclusions?.length ? `<p class="dash-li-meta">Includes: ${esc(q.inclusions.join(', '))}</p>` : ''}
        ${canRespond ? `<div class="prop-actions"><button type="button" class="btn-primary btn-sm" data-act="accept">Accept</button><button type="button" class="btn-ghost btn-sm" data-act="decline">Decline</button></div>` : ''}`;
    } catch { detail.innerHTML = `<p class="dash-empty">Could not load.</p>`; }
    return;
  }
  if (act === 'accept' || act === 'decline') {
    e.target.disabled = true;
    try {
      const r = await portal.respondProposal(row.dataset.id, act === 'accept');
      const tag = row.querySelector('.dash-tag');
      tag.textContent = r.status; tag.className = `dash-tag ${PSTATUS[r.status] || ''}`;
      row.querySelector('.prop-actions')?.remove();
      toast(act === 'accept' ? 'Proposal accepted. Your advisor will proceed.' : 'Proposal declined.');
    } catch (err) { e.target.disabled = false; toast(err.message || 'Action failed.', true); }
  }
});

loadProposals();

/* ── documents vault ────────────────────────────────────────── */
const fmtD = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };
const fmtBytes = (n) => !n ? '' : n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`;
const docsEl = $('#dash-documents');

async function loadDocuments() {
  if (!docsEl) return;
  if (!isApiSession()) { docsEl.innerHTML = `<li class="dash-empty">Sign in to manage documents.</li>`; return; }
  let items = [];
  try { items = (await portal.documents()).items; } catch { docsEl.innerHTML = `<li class="dash-empty">Could not load documents.</li>`; return; }
  docsEl.innerHTML = items.length ? items.map((d) => `
    <li class="dash-li" data-id="${esc(d.id)}">
      <div><p class="dash-li-title">${esc(d.name)}</p><p class="dash-li-meta">${esc([d.uploadedBy === 'portal' ? 'You' : 'BayWorks', fmtBytes(d.sizeBytes), fmtD(d.createdAt)].filter(Boolean).join(' · '))}</p></div>
      <div class="unit-controls">
        <button type="button" class="btn-ghost btn-sm" data-act="dl">Download</button>
        ${d.uploadedBy === 'portal' ? `<button type="button" class="btn-ghost btn-sm" data-act="del">Remove</button>` : ''}
      </div>
    </li>`).join('') : `<li class="dash-empty">No documents yet. Upload LOIs, agreements or KYC here.</li>`;
}

docsEl?.addEventListener('click', async (e) => {
  const li = e.target.closest('.dash-li[data-id]'); if (!li) return;
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'dl') {
    try {
      const d = await portal.documentUrl(li.dataset.id);
      const a = document.createElement('a'); a.href = d.url; a.download = d.name || 'document';
      document.body.appendChild(a); a.click(); a.remove();
    } catch (err) { toast(err.message || 'Download failed.', true); }
  } else if (act === 'del') {
    try { await portal.deleteDocument(li.dataset.id); toast('Document removed.'); loadDocuments(); }
    catch (err) { toast(err.message || 'Could not remove.', true); }
  }
});

$('#doc-file')?.addEventListener('change', (e) => {
  const file = e.target.files[0]; if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast('File too large (max 5 MB).', true); e.target.value = ''; return; }
  const reader = new FileReader();
  reader.onload = async () => {
    try { await portal.uploadDocument({ name: file.name, url: reader.result, mimeType: file.type }); toast('Document uploaded.'); loadDocuments(); }
    catch (err) { toast(err.message || 'Upload failed.', true); }
    e.target.value = '';
  };
  reader.readAsDataURL(file);
});

loadDocuments();

/* ── requirement brief wizard ───────────────────────────────── */
const reqForm = $('#req-form');
const rqToggle = $('#req-toggle');
if (rqToggle && isApiSession()) {
  rqToggle.addEventListener('click', async () => {
    if (!reqForm.hidden) { reqForm.hidden = true; return; }
    try {
      const f = await portal.requirementForm();
      $('#rq-seats').value = f.seats ?? ''; $('#rq-type').value = f.requirementType || '';
      $('#rq-cities').value = f.cities || ''; $('#rq-bmin').value = f.budgetMin ?? '';
      $('#rq-bmax').value = f.budgetMax ?? ''; $('#rq-movein').value = f.moveIn || '';
      $('#rq-urgency').value = f.urgency || '';
    } catch { /* start blank */ }
    reqForm.hidden = false; $('#rq-seats').focus();
  });
  $('#rq-cancel').addEventListener('click', () => { reqForm.hidden = true; });
  reqForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#rq-submit'); btn.disabled = true; btn.textContent = 'Saving…';
    try {
      await portal.saveRequirement({
        seats: $('#rq-seats').value, requirementType: $('#rq-type').value, cities: $('#rq-cities').value,
        budgetMin: $('#rq-bmin').value, budgetMax: $('#rq-bmax').value, moveIn: $('#rq-movein').value, urgency: $('#rq-urgency').value,
      });
      reqForm.hidden = true;
      toast('Requirement brief saved.');
      render(await loadPortalData()); // refresh requirement summary + stat
    } catch (err) { toast(err.message || 'Could not save brief.', true); }
    finally { btn.disabled = false; btn.textContent = 'Save brief'; }
  });
} else if (rqToggle) {
  rqToggle.style.display = 'none'; // editing requires a live session
}

/* ── security / 2FA ─────────────────────────────────────────── */
const secCard = $('#dash-security-card');
const secEl = $('#dash-2fa');
function renderSec(enabled) {
  secEl.innerHTML = enabled
    ? `<div class="sec-row"><div><p class="dash-li-title">Two-factor authentication</p><p class="dash-li-meta">Enabled — a code is required at sign-in</p></div><span class="dash-tag dash-tag-green">ON</span></div>
       <button type="button" class="btn-ghost btn-sm" data-act="disable" style="margin-top:.8rem">Disable 2FA</button>`
    : `<div class="sec-row"><div><p class="dash-li-title">Two-factor authentication</p><p class="dash-li-meta">Add an authenticator app for extra security</p></div><span class="dash-tag">OFF</span></div>
       <button type="button" class="btn-primary btn-sm" data-act="enable" style="margin-top:.8rem">Enable 2FA</button>`;
}
function showBackupCodes(codes) {
  secEl.innerHTML = `
    <p class="dash-li-title">Save your backup codes</p>
    <p class="dash-li-meta">Each can be used once if you lose your authenticator. Store them somewhere safe.</p>
    <div class="backup-codes">${codes.map((c) => `<code>${esc(c)}</code>`).join('')}</div>
    <div style="display:flex;gap:.6rem;margin-top:.8rem">
      <button type="button" class="btn-ghost btn-sm" id="bc-copy">Copy</button>
      <button type="button" class="btn-primary btn-sm" data-act="done-codes">I've saved them</button>
    </div>`;
  const copyBtn = document.getElementById('bc-copy');
  if (copyBtn) copyBtn.addEventListener('click', () => { navigator.clipboard?.writeText(codes.join('\n')); toast('Backup codes copied.'); });
}
async function loadSecurity() {
  if (!isApiSession() || !secCard) return;
  secCard.hidden = false;
  try { renderSec((await portal.twoFaStatus()).enabled); }
  catch { secEl.innerHTML = `<p class="dash-empty">Could not load security settings.</p>`; }
}
secEl?.addEventListener('click', async (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (!act) return;
  if (act === 'enable') {
    secEl.innerHTML = `<p class="dash-li-meta">Generating…</p>`;
    try {
      const s = await portal.twoFaSetup();
      secEl.innerHTML = `
        <p class="dash-li-meta">Scan with Google Authenticator or Authy, then enter the 6-digit code.</p>
        <img src="${s.qr}" alt="2FA QR code" style="width:160px;height:160px;margin:.6rem 0;border:1px solid var(--gray-200);border-radius:8px" />
        <p class="dash-li-meta" style="word-break:break-all">Manual key: <code>${esc(s.secret)}</code></p>
        <div style="display:flex;gap:.5rem;margin-top:.6rem">
          <input id="tf-en-code" class="prop-filter" inputmode="numeric" maxlength="6" placeholder="123456" style="width:130px" />
          <button type="button" class="btn-primary btn-sm" data-act="confirm-enable">Verify &amp; enable</button>
        </div><p class="field-err" id="tf-en-err"></p>`;
    } catch { secEl.innerHTML = `<p class="dash-empty">Could not start setup.</p>`; }
  } else if (act === 'confirm-enable') {
    try {
      const res = await portal.twoFaEnable($('#tf-en-code').value.trim());
      toast('Two-factor authentication enabled.');
      showBackupCodes(res.backupCodes || []);
    } catch (err) { $('#tf-en-err').textContent = err.message || 'Invalid code.'; }
  } else if (act === 'done-codes') {
    renderSec(true);
  } else if (act === 'disable') {
    secEl.innerHTML = `<p class="dash-li-meta">Enter a current code to turn off 2FA.</p>
      <div style="display:flex;gap:.5rem;margin-top:.6rem">
        <input id="tf-dis-code" class="prop-filter" inputmode="numeric" maxlength="6" placeholder="123456" style="width:130px" />
        <button type="button" class="btn-ghost btn-sm" data-act="confirm-disable">Disable</button>
      </div><p class="field-err" id="tf-dis-err"></p>`;
  } else if (act === 'confirm-disable') {
    try { await portal.twoFaDisable($('#tf-dis-code').value.trim()); toast('Two-factor authentication disabled.'); renderSec(false); }
    catch (err) { $('#tf-dis-err').textContent = err.message || 'Invalid code.'; }
  }
});
loadSecurity();

import { initBell } from './notify-bell.js';
initBell({ basePath: '/portal', tokenKey: 'bayworks_portal_token' });

/* ── recent activity ────────────────────────────────────────── */
(async function initActivity() {
  const el = document.getElementById('dash-activity'); if (!el) return;
  if (!isApiSession()) { el.innerHTML = `<li class="dash-empty">Sign in to see your activity.</li>`; return; }
  const ago = (iso) => { const s = Math.floor((Date.now() - new Date(iso)) / 1000); return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };
  const label = (t) => t.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  try { const { items } = await portal.activity(); el.innerHTML = items.length ? items.map((a) => `<li class="dash-li"><div><p class="dash-li-title">${esc(label(a.type))}</p><p class="dash-li-meta">${esc(a.detail || '')}</p></div><span class="dash-li-meta">${esc(ago(a.createdAt))}</span></li>`).join('') : `<li class="dash-empty">No activity yet.</li>`; }
  catch { el.innerHTML = `<li class="dash-empty">Could not load activity.</li>`; }
})();
