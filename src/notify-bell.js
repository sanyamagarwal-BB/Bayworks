/* BAYWORKS — Notification bell (shared across all portal dashboards)
 * initBell({ basePath, tokenKey }) injects a bell + unread badge into the
 * dashboard top bar. Loads recent notifications, marks them read on open, and
 * subscribes to a live SSE stream (Redis-backed) with a poll fallback.
 */
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const BASE = env.VITE_CRM_BASE || '/crm-api';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ago = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export function initBell({ basePath, tokenKey }) {
  const token = () => localStorage.getItem(tokenKey);
  const mount = document.querySelector('.dash-account');
  if (!mount || !token()) return;

  const api = async (path, opts = {}) => {
    const res = await fetch(BASE + basePath + path, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}`, ...(opts.headers || {}) },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.status === 201 || res.status === 200 ? res.json().catch(() => null) : null;
  };

  const wrap = document.createElement('div');
  wrap.className = 'nbell';
  wrap.innerHTML = `
    <button class="nbell-btn" type="button" aria-label="Notifications" aria-haspopup="true" aria-expanded="false">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
      <span class="nbell-badge" hidden>0</span>
    </button>
    <div class="nbell-menu" role="menu" hidden>
      <div class="nbell-head">Notifications</div>
      <div class="nbell-list"><p class="nbell-empty">Loading…</p></div>
    </div>`;
  mount.insertBefore(wrap, mount.firstChild);

  const btn = wrap.querySelector('.nbell-btn');
  const badge = wrap.querySelector('.nbell-badge');
  const menu = wrap.querySelector('.nbell-menu');
  const listEl = wrap.querySelector('.nbell-list');

  let unread = 0;
  const setBadge = (n) => { unread = n; badge.hidden = n <= 0; badge.textContent = n > 9 ? '9+' : String(n); };

  const renderList = (items) => {
    listEl.innerHTML = items.length ? items.map((n) => `
      <div class="nbell-item${n.readAt ? '' : ' is-unread'}">
        <p class="nbell-title">${esc(n.title)}</p>
        ${n.body ? `<p class="nbell-body">${esc(n.body)}</p>` : ''}
        <p class="nbell-time">${esc(ago(n.createdAt))}</p>
      </div>`).join('') : `<p class="nbell-empty">No notifications yet.</p>`;
  };

  async function refresh() {
    try { const r = await api('/notifications/unread-count'); setBadge(r?.count ?? 0); } catch { /* ignore */ }
  }

  async function open() {
    menu.hidden = false; btn.setAttribute('aria-expanded', 'true');
    try {
      const items = await api('/notifications');
      renderList(items || []);
      if (unread > 0) { await api('/notifications/read', { method: 'POST' }); setBadge(0); }
    } catch { listEl.innerHTML = `<p class="nbell-empty">Could not load notifications.</p>`; }
  }
  const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };

  btn.addEventListener('click', (e) => { e.stopPropagation(); menu.hidden ? open() : close(); });
  menu.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', close);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && close());

  // Live stream (SSE via Redis pub/sub); falls back to polling if it errors.
  // EventSource can't set an Authorization header, so instead of putting the
  // real (long-lived) session token in the URL — where it'd sit in server and
  // proxy access logs — we exchange it for a 60s single-purpose ticket first,
  // over a normal authenticated call.
  let polling = null;
  function startPolling() { if (!polling) polling = setInterval(refresh, 30_000); }
  (async () => {
    try {
      const { ticket } = await api('/notifications/sse-ticket');
      const es = new EventSource(`${BASE}${basePath}/notifications/stream?token=${encodeURIComponent(ticket)}`);
      es.onmessage = (ev) => {
        try {
          const n = JSON.parse(ev.data);
          setBadge(unread + 1);
          if (!menu.hidden) open(); // refresh open list
        } catch { /* ignore non-JSON */ }
      };
      es.onerror = () => { es.close(); startPolling(); };
    } catch { startPolling(); }
  })();

  refresh();
}
