/* BAYWORKS — Nav account widget
 * Injects a "Login" link into every page's nav, or an account chip with a
 * dropdown (My Portal / Sign out) when a customer session is active.
 * Imported once from main.js so it runs on all marketing pages.
 */
import { getSession, logout } from './auth.js';

function build() {
  const right = document.querySelector('.nav .header-right');
  if (!right || right.querySelector('[data-nav-account]')) return;

  const session = getSession();
  const mobile = document.querySelector('.nav-mobile');

  if (!session) {
    const link = document.createElement('a');
    link.href = '/login.html';
    link.className = 'nav-login-link';
    link.dataset.navAccount = 'guest';
    link.textContent = 'Login';
    right.insertBefore(link, right.querySelector('.btn-connect') || null);

    // Mobile menu also needs an entry — the desktop button is hidden on narrow screens.
    if (mobile && !mobile.querySelector('[data-nav-account-m]')) {
      const m = document.createElement('a');
      m.href = '/login.html';
      m.dataset.navAccountM = 'guest';
      m.textContent = 'Login';
      mobile.insertBefore(m, mobile.firstChild);
    }
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
