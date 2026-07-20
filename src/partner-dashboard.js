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

/* ── download commission statement (CSV) ────────────────────── */
document.getElementById('comm-download')?.addEventListener('click', async () => {
  const btn = document.getElementById('comm-download');
  btn.disabled = true; const label = btn.textContent; btn.textContent = 'Preparing…';
  try {
    const csv = await partner.commissionStatement();
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'bayworks-commissions.csv'; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('Statement downloaded.');
  } catch (err) { toast(err.message || 'Could not download statement.', true); }
  finally { btn.disabled = false; btn.textContent = label; }
});

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
  const NS = partner;
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
  const dl = document.getElementById('dash-profile'); const cur = partner.cachedUser() || {};
  dl.innerHTML = `<div class="form-row"><label>Name</label><input id="pf-name" value="${esc(cur.name || '')}" /></div><div class="form-row"><label>Company</label><input id="pf-company" value="${esc(cur.company || '')}" /></div><div class="form-row"><label>Phone</label><input id="pf-phone" value="${esc(cur.phone || '')}" /></div><div style="display:flex;gap:.6rem;margin-top:.6rem"><button type="button" class="btn-primary btn-sm" id="pf-save">Save</button><button type="button" class="btn-ghost btn-sm" id="pf-cancel">Cancel</button></div>`;
  document.getElementById('pf-cancel').addEventListener('click', load);
  document.getElementById('pf-save').addEventListener('click', async () => {
    const b = document.getElementById('pf-save'); b.disabled = true;
    try { await partner.updateMe({ name: document.getElementById('pf-name').value, company: document.getElementById('pf-company').value, phone: document.getElementById('pf-phone').value }); toast('Profile updated.'); await load(); }
    catch (err) { b.disabled = false; toast(err.message || 'Could not update.', true); }
  });
});

/* ── recent activity ────────────────────────────────────────── */
(async function initActivity() {
  const el = document.getElementById('dash-activity'); if (!el) return;
  const ago = (iso) => { const s = Math.floor((Date.now() - new Date(iso)) / 1000); return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };
  const label = (t) => t.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  try { const { items } = await partner.activity(); el.innerHTML = items.length ? items.map((a) => `<li class="dash-li"><div><p class="dash-li-title">${esc(label(a.type))}</p><p class="dash-li-meta">${esc(a.detail || '')}</p></div><span class="dash-li-meta">${esc(ago(a.createdAt))}</span></li>`).join('') : `<li class="dash-empty">No activity yet.</li>`; }
  catch { el.innerHTML = `<li class="dash-empty">Could not load activity.</li>`; }
})();
