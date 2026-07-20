/* BAYWORKS — Grievance form controller (DPDP Act Grievance Redressal mechanism) */
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const CRM_BASE = env.VITE_CRM_BASE || '/crm-api';
const CRM_TOKEN = env.VITE_CRM_TOKEN || 'cmrkfynyt0001nzfcjj9x0jcl';
const SUBMIT_URL = `${CRM_BASE}/public/grievance/${CRM_TOKEN}`;

const $ = (s) => document.querySelector(s);
const toast = $('#toast');
function showToast(m, kind = 'error') { toast.textContent = m; toast.className = `auth-toast show ${kind}`; }
function setErr(id, msg) { const el = $(`[data-err="${id}"]`); const i = $('#' + id); if (el) el.textContent = msg || ''; if (i) i.classList.toggle('has-err', !!msg); return !msg; }
function busy(btn, on) { btn.classList.toggle('is-busy', on); btn.disabled = on; }

async function submitGrievance(payload) {
  const res = await fetch(SUBMIT_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && (Array.isArray(data.message) ? data.message[0] : data.message)) || 'Could not submit — please try again.');
  return data;
}

$('#form-grievance').addEventListener('submit', async (e) => {
  e.preventDefault();
  setErr('gr-name', ''); setErr('gr-description', ''); setErr('gr-contact', '');

  const name = $('#gr-name').value.trim();
  const email = $('#gr-email').value.trim();
  const phone = $('#gr-phone').value.trim();
  const category = $('#gr-category').value;
  const description = $('#gr-description').value.trim();

  let ok = true;
  if (!name) ok = setErr('gr-name', 'Please enter your name.') && ok;
  if (!description) ok = setErr('gr-description', 'Please describe your request.') && ok;
  if (!email && !phone) ok = setErr('gr-contact', 'Provide an email or phone number so we can respond to you.') && ok;
  if (!ok) return;

  const btn = $('#gr-submit'); busy(btn, true);
  try {
    await submitGrievance({ name, email: email || undefined, phone: phone || undefined, category, description });
    showToast('Your grievance has been submitted. We\'ll respond using the contact details you provided.', 'success');
    $('#form-grievance').reset();
  } catch (err) {
    showToast(err.message || 'Could not submit — please try again.');
  } finally { busy(btn, false); }
});
