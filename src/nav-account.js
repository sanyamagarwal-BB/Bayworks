/* BAYWORKS — Nav account widget
 * Injects a "Login" dropdown (Customer / Team / Developer / Partner) into every
 * page's nav, or an account chip (My Portal / Sign out) when a customer session
 * is active. Imported once from main.js so it runs on all marketing pages.
 */
import { getSession, logout } from './auth.js';

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const CRM_WEB_URL = env.VITE_CRM_WEB_URL || 'http://localhost:5180/login';

// The login options shown in the dropdown nest.
const LOGINS = [
  { label: 'Customer Login',        sub: 'Clients & corporates',      href: '/login.html' },
  { label: 'Team / CRM Login',      sub: 'BayWorks staff',            href: CRM_WEB_URL, external: true },
  { label: 'Developer Login',       sub: 'Landlords & developers',    href: '/developer-login.html' },
  { label: 'Channel Partner Login', sub: 'Brokers & IPCs',            href: '/partner-login.html' },
];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Wire a trigger button + menu: toggle, outside-click close, Escape close. */
function wireDropdown(wrap) {
  const btn = wrap.querySelector('[aria-haspopup]');
  const menu = wrap.querySelector('[role="menu"]');
  const close = () => { wrap.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = wrap.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
  menu.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', close);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
}

function build() {
  const right = document.querySelector('.nav .header-right');
  if (!right || right.querySelector('[data-nav-account]')) return;

  const session = getSession();
  const mobile = document.querySelector('.nav-mobile');

  if (!session) {
    const wrap = document.createElement('div');
    wrap.className = 'nav-login';
    wrap.dataset.navAccount = 'guest';
    const CHEV = '<svg class="login-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
    const items = LOGINS.map((l) => l.soon
      ? `<span class="login-item is-soon" role="menuitem" aria-disabled="true">
           <span class="login-item-main"><strong>${esc(l.label)}</strong><small>${esc(l.sub)}</small></span>
           <span class="login-soon">Soon</span>
         </span>`
      : `<a class="login-item" role="menuitem" href="${esc(l.href)}"${l.external ? ' target="_blank" rel="noopener"' : ''}>
           <span class="login-item-main"><strong>${esc(l.label)}</strong><small>${esc(l.sub)}</small></span>
           ${l.external ? '<svg class="login-ext" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg>' : ''}
         </a>`).join('');
    wrap.innerHTML = `
      <button type="button" class="nav-login-link" aria-haspopup="true" aria-expanded="false">Login ${CHEV}</button>
      <div class="login-menu" role="menu" aria-label="Login options">${items}</div>`;
    right.insertBefore(wrap, right.querySelector('.btn-connect') || null);
    wireDropdown(wrap);
    // The Login dropdown stays visible in the bar (left of the hamburger) on mobile,
    // so no separate hamburger-menu entry is needed for guests.
    return;
  }

  if (mobile && !mobile.querySelector('[data-nav-account-m]')) {
    const m = document.createElement('a');
    m.href = '/dashboard.html';
    m.dataset.navAccountM = 'user';
    m.textContent = `Signed in as ${(session.name || session.email).split(' ')[0]}`;
    const out = document.createElement('a');
    out.href = '#'; out.textContent = 'Sign out';
    out.style.color = '#B91C1C';
    out.addEventListener('click', (e) => { e.preventDefault(); logout(); location.reload(); });
    mobile.insertBefore(out, mobile.firstChild);
    mobile.insertBefore(m, mobile.firstChild);
  }

  const wrap = document.createElement('div');
  wrap.className = 'nav-account';
  wrap.dataset.navAccount = 'user';
  wrap.style.position = 'relative';
  const initials = (session.name || session.email || '?').trim().charAt(0).toUpperCase();
  wrap.innerHTML = `
    <button class="btn-connect" type="button" aria-haspopup="true" aria-expanded="false"
            style="display:inline-flex;align-items:center;gap:.5rem">
      <span style="display:inline-flex;width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.25);
                   align-items:center;justify-content:center;font-size:.72rem;font-weight:700">${initials}</span>
      <span>${(session.name || 'Account').split(' ')[0]}</span>
    </button>
    <div role="menu" style="position:absolute;right:0;top:calc(100% + 8px);min-width:170px;background:#fff;
         border:1px solid var(--gray-200);border-radius:var(--radius);box-shadow:0 8px 28px rgba(15,23,42,.14);
         padding:.35rem;display:none;z-index:1100">
      <a href="/dashboard.html" role="menuitem" style="display:block;padding:.55rem .7rem;border-radius:6px;
         font-size:.85rem;color:var(--ink)">My Portal</a>
      <button type="button" data-logout role="menuitem" style="width:100%;text-align:left;padding:.55rem .7rem;
         border-radius:6px;font-size:.85rem;color:#B91C1C">Sign out</button>
    </div>`;
  right.insertBefore(wrap, right.querySelector('.btn-connect') || null);

  const btn = wrap.querySelector('button[aria-haspopup]');
  const menu = wrap.querySelector('[role="menu"]');
  const close = () => { menu.style.display = 'none'; btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = menu.style.display === 'block';
    menu.style.display = open ? 'none' : 'block';
    btn.setAttribute('aria-expanded', String(!open));
  });
  document.addEventListener('click', close);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
  wrap.querySelector('[data-logout]').addEventListener('click', () => { logout(); location.reload(); });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
else build();
