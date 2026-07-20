/* BAYWORKS — CRM lead capture
 * Posts marketing-site leads to the CRM's public capture webhook
 * (POST /api/public/capture/:token — no auth, tenant resolved by token).
 * In dev this routes through the Vite proxy (/crm-api) to avoid CORS.
 *
 * Capture payload fields the CRM understands:
 *   { name, email, phone, source, city, budget, intent, utm }
 */

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const CRM_BASE  = env.VITE_CRM_BASE  || '/crm-api';
const CRM_TOKEN = env.VITE_CRM_TOKEN || 'cmrkfynyt0001nzfcjj9x0jcl';
const CAPTURE_URL = `${CRM_BASE}/public/capture/${CRM_TOKEN}`;
const QUEUE_KEY = 'bayworks_lead_queue';

async function post(payload) {
  const res = await fetch(CAPTURE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  // The endpoint returns 201 even on a bad token (body-level {ok:false}), so an
  // HTTP-status-only check here would silently drop the lead without queuing a
  // retry — treat a body-level failure the same as a network/HTTP failure.
  if (data && data.ok === false) throw new Error(data.error || 'capture rejected');
  return data;
}

function queue(payload) {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    q.push({ ...payload, _queuedAt: Date.now() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch { /* storage full / blocked — drop silently */ }
}

/**
 * Capture a lead. Never throws — if the CRM is unreachable the lead is queued
 * in localStorage and retried on the next page load, so the funnel never leaks.
 * @returns {Promise<{ok:boolean, leadId?:string, duplicate?:boolean, error?:string}>}
 */
export async function captureLead(payload) {
  const clean = { source: 'website', ...payload };
  try {
    return await post(clean);
  } catch (err) {
    console.warn('[CRM] capture failed — queued for retry:', err.message);
    queue(clean);
    return { ok: false, error: err.message, queued: true };
  }
}

/** Retry any leads that were queued while the CRM was unreachable. */
export async function flushLeadQueue() {
  let q;
  try { q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return; }
  if (!q || !q.length) return;
  const remaining = [];
  for (const lead of q) {
    try { await post(lead); } catch { remaining.push(lead); }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}
