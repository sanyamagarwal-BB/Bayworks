/* BAYWORKS — lightweight, provider-agnostic analytics
 * Records funnel events so we can learn what converts. No external SDK required:
 *  - pushes to window.dataLayer (so GTM/GA can pick it up if added later)
 *  - keeps a rolling local log in localStorage (inspect via window.bwAnalytics())
 *  - emits a DOM CustomEvent ('bw:track') for any other listener
 */

const LOG_KEY = 'bayworks_analytics';
const LOG_MAX = 200;

export function track(event, props = {}) {
  const payload = { event, ...props, ts: Date.now(), path: location.pathname };

  // 1) dataLayer (GTM / GA4 compatible)
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);

  // 2) rolling local log (capped)
  try {
    const log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    log.push(payload);
    if (log.length > LOG_MAX) log.splice(0, log.length - LOG_MAX);
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
  } catch { /* storage blocked — ignore */ }

  // 3) custom event for ad-hoc listeners
  try { window.dispatchEvent(new CustomEvent('bw:track', { detail: payload })); } catch {}

  if (import.meta.env?.DEV) console.debug('[analytics]', event, props);
}

// Dev helper: inspect the local event log from the console
if (typeof window !== 'undefined') {
  window.bwAnalytics = () => {
    try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; }
  };
}
