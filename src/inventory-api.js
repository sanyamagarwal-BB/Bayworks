/* BAYWORKS — Live inventory (public)
 * Fetches available, published units from the CRM and maps them to the
 * marketing-site property shape. Returns null on any failure so callers keep
 * the CMS/mock listings (graceful fallback, same contract as crm.js).
 */
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const BASE = env.VITE_CRM_BASE || '/crm-api';
const TOKEN = env.VITE_CRM_TOKEN || 'cap_ohlt1p4glsp';

/**
 * @returns {Promise<Array|null>} live property objects, or null if unavailable.
 */
export async function loadInventory() {
  try {
    const res = await fetch(`${BASE}/public/inventory?token=${encodeURIComponent(TOKEN)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const items = data && Array.isArray(data.items) ? data.items : null;
    return items && items.length ? items : null;
  } catch {
    return null; // CRM unreachable → caller keeps existing listings
  }
}
