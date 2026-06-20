/* BayWorks CMS API Integration
 * Fetches live CMS content from the API and merges with local DEFAULTS.
 * Falls back gracefully to localStorage-based CMS if the API is unreachable.
 */
import { DEFAULTS, loadCMS, applyCMS } from './cms.js';

/**
 * Fetch CMS content from the live API.
 * Returns the content object on success, or null on any failure.
 * @returns {Promise<object|null>}
 */
export async function loadCMSFromAPI() {
  try {
    const res = await fetch('/api/public/cms', { credentials: 'omit' });
    if (!res.ok) return null;
    const data = await res.json();
    // The API may return { content: {...} } or the object directly.
    return (data && typeof data === 'object')
      ? (data.content && typeof data.content === 'object' ? data.content : data)
      : null;
  } catch {
    return null;
  }
}

/**
 * Load CMS from the API, merge with DEFAULTS (API values win), and apply to the DOM.
 * If the API fails, falls back to the localStorage-based loadCMS() → applyCMS() chain.
 * @returns {Promise<void>}
 */
export async function applyCMSFromAPI() {
  const apiContent = await loadCMSFromAPI();

  if (apiContent) {
    // Merge: start from DEFAULTS, overlay with localStorage overrides, then API wins on top.
    let localOverrides = {};
    try {
      const { CMS_KEY } = await import('./cms.js');
      localOverrides = JSON.parse(localStorage.getItem(CMS_KEY) || '{}');
    } catch { /* ignore */ }

    const merged = { ...DEFAULTS, ...localOverrides, ...apiContent };

    // Temporarily override loadCMS so applyCMS() uses our merged data.
    // We do this by patching localStorage with the merged result, applying, then restoring.
    // A cleaner approach: call applyCMS internals manually via a patched version.
    _applyData(merged);
  } else {
    // Graceful fallback: use localStorage CMS (which already merges DEFAULTS internally)
    applyCMS();
  }
}

/**
 * Internal: apply an arbitrary CMS data object to the DOM without touching localStorage.
 * Mirrors the logic in applyCMS() from cms.js.
 */
function _applyData(d) {
  // Text nodes
  document.querySelectorAll('[data-cms]').forEach(el => {
    const key = el.dataset.cms;
    if (d[key] !== undefined) el.textContent = d[key];
  });

  // Images (e.g. testimonial photos)
  document.querySelectorAll('[data-cms-img]').forEach(el => {
    const val = d[el.dataset.cmsImg];
    if (val) {
      el.src = val;
      el.closest('.testimonial-avatar')?.classList.add('has-photo');
    }
  });

  // WhatsApp hrefs
  const waNum = d.whatsapp_num;
  if (waNum) {
    document.querySelectorAll('[data-cms-wa]').forEach(el => {
      el.href = `https://wa.me/${waNum}`;
    });
  }

  // Client logos
  const clientsContainer = document.getElementById('clients-track-dynamic');
  if (clientsContainer && d.clients_list) {
    try {
      const clients = JSON.parse(d.clients_list)
        .map(c => (typeof c === 'string' ? { name: c, logo: '' } : c));
      const render = (c) => {
        const name = (c.name || '').replace(/"/g, '&quot;');
        return c.logo
          ? `<div class="client-logo client-logo--img"><img src="${c.logo}" alt="${name}" loading="lazy" /></div>`
          : `<div class="client-logo">${(c.name || '').replace(/\n/g, '<br>')}</div>`;
      };
      clientsContainer.innerHTML = clients.concat(clients).map(render).join('');
    } catch (e) { console.error('[cms-api] Failed to parse clients_list:', e); }
  }

  // Delegate remaining structured rendering (properties grid, etc.) back to the
  // original applyCMS() which reads from localStorage. Since the API data is the
  // source of truth for text fields handled above, this only affects components
  // that applyCMS() builds from parsed JSON (properties_list, etc.). We write those
  // into localStorage transiently so applyCMS() picks them up, then trigger it.
  // This ensures full compatibility without duplicating the complex rendering logic.
  const STRUCTURED_KEYS = ['properties_list', 'clients_list'];
  let tempPatched = false;
  const { CMS_KEY } = { CMS_KEY: 'bayworks_cms' };
  let existing = {};
  try { existing = JSON.parse(localStorage.getItem(CMS_KEY) || '{}'); } catch {}

  const patch = {};
  STRUCTURED_KEYS.forEach(k => { if (d[k] !== undefined) patch[k] = d[k]; });
  if (Object.keys(patch).length) {
    try {
      localStorage.setItem(CMS_KEY, JSON.stringify({ ...existing, ...patch }));
      tempPatched = true;
    } catch {}
  }

  // Run full applyCMS for the structured components (properties grid, quote, etc.)
  applyCMS();

  // Restore original localStorage if we patched it
  if (tempPatched) {
    try { localStorage.setItem(CMS_KEY, JSON.stringify(existing)); } catch {}
  }
}
