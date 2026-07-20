/* BAYWORKS — cookie / tracking consent banner (shared across public marketing pages).
 * No analytics or ad-pixel scripts are wired into the site yet — this exists so
 * that whenever one is added (Meta Pixel, Google Ads, GA4), it has a consent gate
 * to sit behind from day one instead of firing unconditionally.
 *
 * Usage for a future tracking script:
 *   if (window.BayWorksConsent.hasConsent()) { /* fire pixel *\/ }
 *   window.BayWorksConsent.onConsent(() => { /* fire pixel *\/ });
 */
(function () {
  const STORAGE_KEY = 'bw-cookie-consent'; // 'accepted' | 'necessary-only'
  const listeners = [];

  function getChoice() {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }
  function setChoice(v) {
    try { localStorage.setItem(STORAGE_KEY, v); } catch { /* ignore */ }
    if (v === 'accepted') listeners.forEach((cb) => { try { cb(); } catch { /* ignore */ } });
  }

  window.BayWorksConsent = {
    hasConsent: () => getChoice() === 'accepted',
    onConsent: (cb) => { if (getChoice() === 'accepted') cb(); else listeners.push(cb); },
  };

  if (getChoice()) return; // already decided, no banner

  function init() {
    const bar = document.createElement('div');
    bar.className = 'bw-cookie-consent';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Cookie consent');
    bar.innerHTML = `
      <div class="bw-cc-inner">
        <p class="bw-cc-text">We use cookies for essential site features and, with your consent, to understand how visitors use BayWorks so we can improve it. See our <a href="/privacy.html">Privacy Policy</a>.</p>
        <div class="bw-cc-actions">
          <button type="button" class="bw-cc-btn bw-cc-necessary">Necessary only</button>
          <button type="button" class="bw-cc-btn bw-cc-accept">Accept all</button>
        </div>
      </div>`;
    document.body.appendChild(bar);

    const style = document.createElement('style');
    style.textContent = `
      .bw-cookie-consent { position: fixed; left: 0; right: 0; bottom: 0; z-index: 9999;
        background: #0f172a; color: #f1f5f9; padding: 16px 20px; box-shadow: 0 -4px 20px rgba(0,0,0,.2); }
      .bw-cc-inner { max-width: 1100px; margin: 0 auto; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px; }
      .bw-cc-text { margin: 0; font-size: 13.5px; line-height: 1.5; max-width: 68ch; color: #cbd5e1; }
      .bw-cc-text a { color: #6ee7b7; text-decoration: underline; }
      .bw-cc-actions { display: flex; gap: 10px; flex: none; }
      .bw-cc-btn { font: inherit; font-size: 13.5px; font-weight: 600; padding: 9px 16px; border-radius: 8px; cursor: pointer; border: 1px solid transparent; }
      .bw-cc-necessary { background: transparent; border-color: #475569; color: #e2e8f0; }
      .bw-cc-necessary:hover { border-color: #94a3b8; }
      .bw-cc-accept { background: #059669; color: #fff; }
      .bw-cc-accept:hover { background: #047857; }
      @media (max-width: 640px) { .bw-cc-inner { flex-direction: column; align-items: stretch; } .bw-cc-actions { justify-content: flex-end; } }
    `;
    document.head.appendChild(style);

    bar.querySelector('.bw-cc-accept').addEventListener('click', () => { setChoice('accepted'); bar.remove(); });
    bar.querySelector('.bw-cc-necessary').addEventListener('click', () => { setChoice('necessary-only'); bar.remove(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
