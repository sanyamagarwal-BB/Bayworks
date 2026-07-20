/* BAYWORKS — Main JS */
import { applyCMSFromAPI } from './cms-api.js';
import { applyCMS, CMS_KEY } from './cms.js';
import { loadInventory } from './inventory-api.js';
import { isApiSession } from './auth.js';
import { addShortlist, removeShortlist, savedUnitIds } from './portal-api.js';
import { initCity } from './city.js';
import { captureLead, flushLeadQueue } from './crm.js';
import { track } from './analytics.js';
import './nav-account.js';

// Hero brief form — captures the lead to CRM, then opens WhatsApp pre-filled
function handleHeroBrief(e) {
  e.preventDefault();
  const f = e.target;
  const seats = f.seats.value || 'Not specified';
  const city  = f.city.value  || 'Not specified';
  const phone = f.phone.value || '';

  // Fire-and-forget lead capture (queues locally if CRM is down)
  captureLead({
    name: phone ? `Web enquiry (${phone})` : 'Website enquiry',
    phone,
    city: city === 'Not specified' ? undefined : city,
    budget: seats === 'Not specified' ? undefined : `${seats} seats`,
    intent: 'WARM',
    source: 'website_hero',
    utm: { source: 'website', medium: 'hero_form', campaign: 'corporate_leasing' },
  });
  track('lead_captured', { source: 'website_hero' });

  const msg = encodeURIComponent(
    `Hi BAYWORKS, I need office space:\n• Seats: ${seats}\n• City: ${city}\n• My number: ${phone}\n\nPlease send me a shortlist.`
  );
  window.open(`https://wa.me/919205005399?text=${msg}`, '_blank');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('hero-brief-form')?.addEventListener('submit', handleHeroBrief);
  applyCMSFromAPI().then(hydrateLiveInventory);
  initNav();
  initReveal();
  initCounters();
  initFAQ();
  initProperties();
  initHeroBackground();
  initPropertyModal();
  initFeatured();
  initComingSoon();
  maybeOpenDeepLinkedProperty();   // ?property=<idx> from the Home featured teaser
  flushLeadQueue();   // retry any leads queued while the CRM was unreachable
  track('page_view', { title: document.title });
});

/* Replace the CMS/mock listings with live CRM inventory when the CRM is up.
 * Reuses the existing render path (applyCMS) via a transient CMS-store patch —
 * same approach as cms-api.js — then restores the store. If the CRM is
 * unreachable, loadInventory() returns null and the CMS/mock listings stay. */
async function hydrateLiveInventory() {
  if (!document.getElementById('properties-grid') && !document.getElementById('featured-grid')) return;
  const live = await loadInventory();
  if (!live) return;
  const prev = localStorage.getItem(CMS_KEY);
  try {
    const cur = prev ? JSON.parse(prev) : {};
    localStorage.setItem(CMS_KEY, JSON.stringify({ ...cur, properties_list: JSON.stringify(live) }));
    applyCMS(); // re-render grid / featured / booking dropdown from live units
  } catch (e) {
    console.warn('[inventory] live hydrate failed:', e);
  } finally {
    if (prev === null) localStorage.removeItem(CMS_KEY); // DOM already rendered; restore store
    else localStorage.setItem(CMS_KEY, prev);
  }
  await markServerShortlist();
}

/* For a logged-in customer, reflect their saved CRM shortlist on the live cards
 * (heart filled) and mirror into local favorites so the "Saved" filter agrees. */
async function markServerShortlist() {
  const grid = document.getElementById('properties-grid');
  if (!grid || !isApiSession()) return;
  const saved = await savedUnitIds();
  if (!saved.size) return;
  const favs = getFavs();
  grid.querySelectorAll('.property-card[data-unit-id]').forEach((card) => {
    if (!saved.has(card.dataset.unitId)) return;
    card.classList.add('is-fav');
    card.querySelector('.fav-btn')?.setAttribute('aria-pressed', 'true');
    if (card.dataset.name && !favs.includes(card.dataset.name)) favs.push(card.dataset.name);
  });
  setFavs(favs);
  if (typeof window.filterProperties === 'function') window.filterProperties();
}

/* Open a specific property if arrived via /properties.html?property=<idx> */
function maybeOpenDeepLinkedProperty() {
  const modal = document.getElementById('property-modal');
  if (!modal) return;
  const pid = new URLSearchParams(location.search).get('property');
  if (pid === null) return;
  const idx = parseInt(pid, 10);
  if (Number.isNaN(idx)) return;
  setTimeout(() => {
    document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    openPropertyModal(idx);
  }, 350);
}

/* ── SPRINT-2 FEATURES: honest "Coming soon" treatment ─────────── */
function initComingSoon() {
  document.querySelectorAll('.feature-card-row').forEach(row => {
    const title = row.querySelector('.feature-title');
    if (title && !title.querySelector('.coming-soon-badge')) {
      const badge = document.createElement('span');
      badge.className = 'coming-soon-badge';
      badge.textContent = 'Coming soon';
      title.appendChild(badge);
    }
    // Turn the dead "Coming Soon" CTAs into clearly non-interactive labels
    row.querySelectorAll('button.btn-secondary').forEach(btn => {
      if (/coming soon/i.test(btn.textContent)) {
        btn.disabled = true;
        btn.classList.add('is-coming-soon');
        btn.setAttribute('aria-disabled', 'true');
      }
    });
  });
}

/* ── HERO BACKGROUND: real video → 3D city → gradient ──────────── */
function initHeroBackground() {
  const video  = document.getElementById('hero-video');
  const canvas = document.getElementById('city-canvas');
  let decided = false;

  const useCity = () => {            // no playable video → keep the 3D city
    if (decided) return; decided = true;
    video?.remove();
    initCity(canvas);
  };
  const useVideo = () => {           // real clip is present → use it
    if (decided) return; decided = true;
    canvas?.remove();
    video.classList.add('is-ready');
  };

  if (!video) { useCity(); return; }

  video.addEventListener('canplay', useVideo, { once: true });
  video.addEventListener('error', useCity, { once: true });
  video.querySelector('source')?.addEventListener('error', useCity, { once: true });
  // Safety net: only bail once the browser has given up finding a playable
  // source. A large clip on a slow connection is still "arriving" (readyState
  // stays low for a while) and shouldn't be abandoned for the 3D fallback —
  // that used to happen after just 2.5s, which made the real video flicker
  // into the canvas fallback on anything slower than localhost.
  setTimeout(() => {
    if (!decided && video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) useCity();
  }, 8000);
}

/* ── FAVORITES (localStorage, no account needed) ──────────────── */
const FAV_KEY = 'bayworks_favorites';
function getFavs() { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; } }
function setFavs(arr) { localStorage.setItem(FAV_KEY, JSON.stringify(arr)); updateFavCount(); }
function toggleFav(name) {
  const f = getFavs();
  const i = f.indexOf(name);
  if (i >= 0) f.splice(i, 1); else f.push(name);
  setFavs(f);
  return f.includes(name);
}
function updateFavCount() {
  const el = document.getElementById('fav-count');
  if (el) el.textContent = getFavs().length;
}

/* ── PROPERTIES: search · filter · sort · favorites · load-more ── */
const PAGE_SIZE = 6;
let favOnly = false;
let visibleLimit = PAGE_SIZE;

function initProperties() {
  const grid   = document.getElementById('properties-grid');
  const search = document.getElementById('prop-search');
  const city   = document.getElementById('prop-city');
  const size   = document.getElementById('prop-size');
  const sort   = document.getElementById('prop-sort');
  const meta   = document.getElementById('properties-meta');
  const empty  = document.getElementById('properties-empty');
  const loadmore = document.getElementById('properties-loadmore');
  const loadBtn  = document.getElementById('load-more');
  const favBtn   = document.getElementById('fav-filter');
  const clearBtn = document.getElementById('clear-filters');
  if (!grid) return;

  const num = (v) => parseFloat(v) || 0;

  // Exposed so cms.js can re-apply after (re)rendering cards
  window.filterProperties = function () {
    const q = (search?.value || '').trim().toLowerCase();
    const c = city?.value || '';
    const s = size?.value || '';
    const mode = sort?.value || '';
    const favs = getFavs();
    const all = [...grid.querySelectorAll('.property-card')];

    let matched = all.filter(card => {
      const matchSearch = !q || (card.dataset.search || '').includes(q);
      const matchCity   = !c || card.dataset.city === c;
      const matchSize   = !s || card.dataset.size === s;
      const matchFav    = !favOnly || favs.includes(card.dataset.name);
      return matchSearch && matchCity && matchSize && matchFav;
    });

    if (mode) {
      const [key, dir] = mode.split('-');
      const dataKey = key === 'size' ? 'sqft' : key;   // numeric sqft, not the bucket label
      const sign = dir === 'desc' ? -1 : 1;
      matched.sort((a, b) => sign * (num(a.dataset[dataKey]) - num(b.dataset[dataKey])));
    }

    // Hide everything, reorder matched, then reveal up to the current limit
    all.forEach(c => c.classList.add('is-hidden'));
    matched.forEach(c => grid.appendChild(c));
    matched.slice(0, visibleLimit).forEach(c => c.classList.remove('is-hidden'));

    const shown = Math.min(matched.length, visibleLimit);
    if (meta) meta.textContent = matched.length
      ? `Showing ${shown} of ${matched.length}${matched.length !== all.length ? ` matching` : ''} ${matched.length === 1 ? 'property' : 'properties'}`
      : '';
    if (empty) empty.hidden = matched.length > 0;
    if (loadmore) loadmore.hidden = matched.length <= visibleLimit;
  };

  const reapply = () => { visibleLimit = PAGE_SIZE; window.filterProperties(); };

  search?.addEventListener('input', reapply);
  city?.addEventListener('change', () => { reapply(); track('property_filter', { field: 'city', value: city.value }); });
  size?.addEventListener('change', () => { reapply(); track('property_filter', { field: 'size', value: size.value }); });
  sort?.addEventListener('change', () => { reapply(); track('property_sort', { value: sort.value }); });

  loadBtn?.addEventListener('click', () => {
    visibleLimit += PAGE_SIZE;
    window.filterProperties();
    track('property_load_more', { limit: visibleLimit });
  });

  favBtn?.addEventListener('click', () => {
    favOnly = !favOnly;
    favBtn.classList.toggle('is-active', favOnly);
    favBtn.setAttribute('aria-pressed', String(favOnly));
    reapply();
    track('property_fav_filter', { on: favOnly });
  });

  clearBtn?.addEventListener('click', () => {
    if (search) search.value = '';
    if (city) city.value = '';
    if (size) size.value = '';
    if (sort) sort.value = '';
    favOnly = false;
    favBtn?.classList.remove('is-active');
    favBtn?.setAttribute('aria-pressed', 'false');
    reapply();
  });

  // Favorite toggle (event delegation — cards are re-rendered by the CMS)
  grid.addEventListener('click', (e) => {
    const favTrigger = e.target.closest('.fav-btn');
    if (!favTrigger) return;
    e.stopPropagation();
    const name = favTrigger.dataset.fav;
    const saved = toggleFav(name);
    favTrigger.setAttribute('aria-pressed', String(saved));
    const card = favTrigger.closest('.property-card');
    card?.classList.toggle('is-fav', saved);
    // Logged-in customers: persist to their CRM shortlist (live units only).
    const unitId = card?.dataset.unitId;
    if (unitId && isApiSession()) {
      (saved ? addShortlist(unitId) : removeShortlist(unitId)).catch(() => { /* offline — local fav still set */ });
    }
    if (favOnly) reapply();
    track('property_favorite', { name, saved });
  });

  updateFavCount();
  window.filterProperties();
}

/* ── PROPERTY CARDS: per-card CTAs + detail modal ──────────────── */
function initPropertyModal() {
  const dialog = document.getElementById('property-modal');
  // Modal close handlers run on any page that has the dialog (Home, Properties)
  if (dialog) {
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.querySelector('[data-modal-close]')?.addEventListener('click', () => dialog.close());
  }

  const grid = document.getElementById('properties-grid');
  if (!grid) return;   // listing-grid handlers only where the listing exists

  grid.addEventListener('click', (e) => {
    if (e.target.closest('.fav-btn')) return;            // favorite toggle handled elsewhere
    const bookBtn = e.target.closest('[data-action="book"]');
    if (bookBtn) { e.stopPropagation(); bookTour(+bookBtn.dataset.idx); return; }
    if (e.target.closest('[data-action="wa"]')) {
      const card = e.target.closest('.property-card');
      track('property_whatsapp', { name: card?.dataset.name });
      return; // let the WhatsApp link open
    }
    const card = e.target.closest('.property-card');
    if (card) openPropertyModal(+card.dataset.idx);
  });

  grid.addEventListener('keydown', (e) => {
    const card = e.target.closest('.property-card');
    if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openPropertyModal(+card.dataset.idx); }
  });
}

function openPropertyModal(idx) {
  const p = (window.__BAYWORKS_PROPS || [])[idx];
  const dialog = document.getElementById('property-modal');
  if (!p || !dialog) return;

  const statusSlug = (p.status || 'Available').toLowerCase().split(' ')[0];
  const heroSrc = p.image || (Array.isArray(p.images) && p.images[0]) || '';
  const img = heroSrc
    ? `<img src="${heroSrc}" alt="${p.name || ''}" />`
    : `<div class="property-modal-img--empty">${p.city || 'Property'}</div>`;

  const body = dialog.querySelector('#property-modal-body');
  body.innerHTML = `
    <div class="property-modal-img">${img}</div>
    <div class="property-modal-info">
      <span class="property-status status--${statusSlug}">${p.status || 'Available'}</span>
      <h3>${p.name || ''}</h3>
      <div class="property-modal-meta">
        <div><span>City</span><strong>${p.city || '—'}</strong></div>
        <div><span>Size</span><strong>${p.size || '—'}</strong></div>
        <div><span>Type</span><strong>${p.type || '—'}</strong></div>
        <div><span>Status</span><strong>${p.status || 'Available'}</strong></div>
      </div>
      ${p.unitId ? `<a class="btn-ghost btn-block" style="margin:.2rem 0 1rem" href="/properties-detail.html?unitId=${encodeURIComponent(p.unitId)}">View full details</a>` : ''}
      <div class="connect-box">
        <p class="connect-title">Interested? Leave your number and our team will connect you.</p>
        <input type="tel" id="connect-phone" class="connect-input" placeholder="Your phone number" autocomplete="tel" />
        <div class="connect-actions">
          <button type="button" class="btn-primary" data-connect="whatsapp">Connect on WhatsApp</button>
          <button type="button" class="btn-ghost" data-connect="call">Request a Call</button>
        </div>
        <p class="connect-hint">We'll only use this to reach you about this property.</p>
      </div>
    </div>`;

  const phoneInput = body.querySelector('#connect-phone');
  body.querySelectorAll('[data-connect]').forEach(btn => {
    btn.addEventListener('click', () => {
      const phone = (phoneInput.value || '').trim();
      if (phone.replace(/\D/g, '').length < 10) { alert('Please enter a valid phone number (with country/area code).'); phoneInput.focus(); return; }
      const method = btn.dataset.connect;

      if (method === 'whatsapp') {
        if (!confirm(`Connect with BAYWORKS on WhatsApp about "${p.name}"?`)) return;
        captureLead({ name: `Featured enquiry — ${p.name}`, phone, city: p.city, intent: 'HOT', source: 'website_featured_whatsapp', budget: p.name, utm: { source: 'website', medium: 'featured_connect', method: 'whatsapp', property: p.name } });
        track('lead_captured', { source: 'website_featured_whatsapp' });
        track('featured_connect', { method: 'whatsapp', name: p.name });
        const msg = encodeURIComponent(`Hi BAYWORKS, I'm interested in "${p.name}" (${p.city}). My number: ${phone}. Please connect.`);
        window.open(`https://wa.me/919205005399?text=${msg}`, '_blank', 'noopener');
        dialog.close();
      } else {
        if (!confirm(`Request a callback on ${phone} about "${p.name}"?`)) return;
        captureLead({ name: `Callback request — ${p.name}`, phone, city: p.city, intent: 'HOT', source: 'website_featured_call', budget: p.name, utm: { source: 'website', medium: 'featured_connect', method: 'call', property: p.name } });
        track('lead_captured', { source: 'website_featured_call' });
        track('featured_connect', { method: 'call', name: p.name });
        alert(`Thanks! Our team will call you on ${phone} shortly.`);
        dialog.close();
      }
    });
  });

  dialog.showModal();
  track('property_view', { name: p.name, city: p.city });
}

/* ── FEATURED PROJECTS: scroll into the listing, then open detail ── */
function initFeatured() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  const open = (card) => {
    const idx = +card.dataset.idx;
    track('featured_click', { idx, name: (window.__BAYWORKS_PROPS || [])[idx]?.name });
    // Open the detail popup in place (every page now has the modal) — no routing
    if (document.getElementById('property-modal')) {
      openPropertyModal(idx);
    } else {
      window.location.href = `/properties.html?property=${idx}`;   // fallback
    }
  };
  grid.addEventListener('click', (e) => {
    // Per-card image carousel arrows — handle, don't open the card
    const navBtn = e.target.closest('.fcard-nav');
    if (navBtn) {
      e.stopPropagation();
      const track = navBtn.closest('.fcard-gallery')?.querySelector('.fcard-imgs');
      if (track) track.scrollBy({ left: (navBtn.classList.contains('fcard-next') ? 1 : -1) * track.clientWidth, behavior: 'smooth' });
      return;
    }
    const card = e.target.closest('.featured-card');
    if (card) open(card);
  });
  grid.addEventListener('keydown', (e) => {
    const card = e.target.closest('.featured-card');
    if (card && (e.key === 'Enter' || e.key === ' ') && !e.target.closest('.fcard-nav')) { e.preventDefault(); open(card); }
  });

  // Keep each card's "n/total" badge in sync as its images scroll (scroll doesn't bubble → capture)
  grid.addEventListener('scroll', (e) => {
    const t = e.target;
    if (t.classList && t.classList.contains('fcard-imgs')) {
      const i = Math.round(t.scrollLeft / t.clientWidth);
      const badge = t.parentElement.querySelector('.fcard-count');
      if (badge) badge.textContent = `${i + 1}/${t.children.length}`;
    }
  }, true);

  // Ribbon left/right arrows scroll the whole row (~2 cards at a time)
  const prev = document.getElementById('featured-prev');
  const next = document.getElementById('featured-next');
  if (prev && next) {
    const step = () => {
      const card = grid.querySelector('.featured-card');
      return (card ? card.getBoundingClientRect().width + 24 : grid.clientWidth * 0.8) * 2;
    };
    prev.addEventListener('click', () => grid.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => grid.scrollBy({ left: step(), behavior: 'smooth' }));
    const updateArrows = () => {
      prev.toggleAttribute('disabled', grid.scrollLeft <= 4);
      next.toggleAttribute('disabled', grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 4);
    };
    grid.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    updateArrows();
    setTimeout(updateArrows, 400);   // re-check after images load
  }

  // Gentle auto-float (ping-pong) — pauses when the cursor / finger is on it
  if (grid.classList.contains('featured-row') &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const ribbon = grid.closest('.featured-ribbon') || grid;
    let dir = 1, paused = false;
    const SPEED = 1.6;                                  // px per frame (~96px/s)
    const pause = () => { paused = true; };
    const resume = () => { if (!ribbon.matches(':hover')) paused = false; };
    ribbon.addEventListener('mouseenter', pause);
    ribbon.addEventListener('mouseleave', () => { paused = false; });
    ribbon.addEventListener('pointerdown', pause);
    ribbon.addEventListener('pointerup', () => setTimeout(resume, 1200));
    ribbon.addEventListener('focusin', pause);
    ribbon.addEventListener('focusout', () => setTimeout(resume, 1200));
    const tick = () => {
      if (!paused && grid.scrollWidth > grid.clientWidth + 1) {
        grid.scrollLeft += dir * SPEED;
        if (grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 1) dir = -1;
        else if (grid.scrollLeft <= 0) dir = 1;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

function bookTour(idx) {
  const p = (window.__BAYWORKS_PROPS || [])[idx];
  if (!p) return;
  track('book_tour_click', { name: p.name });
  const select = document.getElementById('booking-property');
  if (select) {
    const opt = [...select.options].find(o => o.textContent.startsWith(p.name));
    if (opt) select.value = opt.value;
  }
  // Reset the booking form in case a previous booking left it on the success state
  const form = document.querySelector('.booking-form');
  const success = document.getElementById('booking-success');
  if (form) form.style.display = '';
  if (success) success.style.display = 'none';
  document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── NAV: scroll class + mobile toggle ────────────────────────── */
function initNav() {
  const nav = document.getElementById('nav');
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('nav-mobile');

  // Scroll class
  const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 50);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Hamburger
  hamburger?.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    mobileMenu?.classList.toggle('open', open);
    nav?.classList.toggle('menu-open', open);
  });

  // Close mobile menu on link click
  mobileMenu?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger?.classList.remove('open');
      mobileMenu?.classList.remove('open');
      nav?.classList.remove('menu-open');
    });
  });
}

/* ── SCROLL REVEAL ─────────────────────────────────────────────── */
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Stagger siblings in the same grid
        const siblings = [...entry.target.parentElement.querySelectorAll('.reveal:not(.in-view)')];
        const delay = siblings.indexOf(entry.target) * 80;
        setTimeout(() => entry.target.classList.add('in-view'), delay);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  els.forEach(el => obs.observe(el));
}

/* ── COUNTER ANIMATIONS ────────────────────────────────────────── */
/* Counts up to whatever each metric actually says in the page/CMS —
   prefix, number and suffix are parsed from the text, so the value
   can never drift out of sync with the content (e.g. "120k+", "21 days"). */
function initCounters() {
  const metrics = document.querySelectorAll('.metric-num');

  // Parse "120k+", "40%", "0%", "21 days", "₹1,200" → {prefix, target, suffix, decimals}
  const parse = (text) => {
    const m = text.match(/^(\D*?)([\d.,]+)(.*)$/s);
    if (!m) return null;
    const numStr = m[2].replace(/,/g, '');
    const decimals = numStr.includes('.') ? (numStr.split('.')[1]?.length || 0) : 0;
    return { prefix: m[1], target: parseFloat(numStr), suffix: m[3], decimals };
  };

  const animateNum = (el, { prefix, target, suffix, decimals }) => {
    const duration = 1800;
    const startTime = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const value = eased * target;
      const shown = decimals
        ? value.toFixed(decimals)
        : Math.floor(value).toLocaleString();
      el.textContent = prefix + shown + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  // Snapshot each metric's real value before animating
  const items = [...metrics].map(el => ({ el, spec: parse(el.textContent.trim()) }));

  const obs = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      items.forEach(({ el, spec }) => { if (spec) animateNum(el, spec); });
      obs.disconnect();
    }
  }, { threshold: 0.5 });

  const heroMetrics = document.querySelector('.hero-metrics');
  if (heroMetrics) obs.observe(heroMetrics);
}

/* ── FAQ ACCORDION ────────────────────────────────────────────── */
function initFAQ() {
  document.querySelectorAll('.faq-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const answerId = btn.dataset.faq;
      const answer = document.getElementById(answerId);
      const isOpen = answer.classList.contains('open');

      // Close all other FAQs
      document.querySelectorAll('.faq-answer').forEach(a => a.classList.remove('open'));
      document.querySelectorAll('.faq-toggle').forEach(b => b.classList.remove('open'));

      // Toggle current
      if (!isOpen) {
        answer.classList.add('open');
        btn.classList.add('open');
      }
    });
  });
}

/* ═════════════════════════════════════════════════════════════ */
/* SPRINT 1: GAME-CHANGER FEATURES - INTERACTIVE JS */
/* ═════════════════════════════════════════════════════════════ */

/* QUOTE GENERATOR */
document.getElementById('quote-btn')?.addEventListener('click', () => {
  const city = document.getElementById('quote-city');
  const size = parseFloat(document.getElementById('quote-size').value);
  const duration = parseInt(document.getElementById('quote-duration').value);
  
  if (!city.value || !size || size < 1000) {
    alert('Please enter valid city and size (min 1000 sqft)');
    return;
  }
  
  const pricePerSqFt = parseFloat(city.options[city.selectedIndex].dataset.price) || 80;
  const monthlyRent = (size * pricePerSqFt) / 1000;
  const totalMonthly = Math.round(monthlyRent);
  
  document.getElementById('quote-display').textContent = '₹' + totalMonthly.toLocaleString();
  document.querySelector('.quote-form').style.display = 'none';
  document.getElementById('quote-result').style.display = 'block';
  track('quote_generated', { city: city.value, size, duration, monthly: totalMonthly });
});

/* SAVINGS CALCULATOR */
function updateSavings() {
  const currentRent = parseFloat(document.getElementById('current-rent').value) || 0;
  const currentCapex = parseFloat(document.getElementById('current-capex').value) || 0;
  const baywoksRent = parseFloat(document.getElementById('bayworks-rent').value) || 0;
  
  const currentAnnual = (currentRent * 12) + currentCapex;
  const baywoksAnnual = baywoksRent * 12;
  const savings = currentAnnual - baywoksAnnual;
  const percent = currentAnnual > 0 ? Math.round((savings / currentAnnual) * 100) : 0;
  
  document.getElementById('current-total').textContent = '₹' + currentAnnual.toLocaleString();
  document.getElementById('bayworks-total').textContent = '₹' + baywoksAnnual.toLocaleString();
  document.getElementById('savings-amount').textContent = '₹' + Math.max(0, savings).toLocaleString();
  document.getElementById('savings-pct').textContent = `/year (${Math.max(0, percent)}% reduction)`;
}
document.getElementById('current-rent')?.addEventListener('input', updateSavings);
document.getElementById('current-capex')?.addEventListener('input', updateSavings);
document.getElementById('bayworks-rent')?.addEventListener('input', updateSavings);

/* PROPERTY BOOKING */
document.querySelectorAll('.booking-time-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.booking-time-btn').forEach(b => b.classList.remove('selected'));
    e.target.classList.add('selected');
  });
});

document.getElementById('booking-confirm')?.addEventListener('click', () => {
  const property = document.getElementById('booking-property').value;
  const date = document.getElementById('booking-date').value;
  const selected = document.querySelector('.booking-time-btn.selected');
  const time = selected ? selected.dataset.time : 'Not selected';
  const name = document.getElementById('booking-name').value;
  const phone = document.getElementById('booking-phone').value;
  
  if (!date || !selected || !name || !phone) {
    alert('Please fill all fields');
    return;
  }

  // A tour booking is a hot lead — push it to the CRM
  const propEl = document.getElementById('booking-property');
  const city = propEl?.selectedOptions?.[0]?.dataset.city || undefined;
  captureLead({
    name,
    phone,
    city,
    intent: 'HOT',
    source: 'website_booking',
    budget: property,
    utm: { source: 'website', medium: 'tour_booking', property, date, time },
  });
  track('lead_captured', { source: 'website_booking' });
  track('tour_booked', { property, date, time });

  document.querySelector('.booking-form').style.display = 'none';
  document.getElementById('booking-success').style.display = 'block';
  document.getElementById('booking-confirm-text').textContent = `${property} on ${date} at ${time}. Our team will confirm on WhatsApp shortly.`;
});

/* LEAD QUALIFICATION QUIZ */
let quizAnswers = {};
document.querySelectorAll('.quiz-opt').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const currentQ = e.target.closest('.quiz-question');
    const nextQ = currentQ.nextElementSibling;

    if (nextQ && nextQ.classList.contains('quiz-question')) {
      currentQ.style.display = 'none';
      nextQ.style.display = 'block';
      quizAnswers[`q${Object.keys(quizAnswers).length + 1}`] = e.target.dataset.pkg || e.target.textContent;
    } else {
      showQuizResult(e.target.dataset.pkg || 'pro');
    }
  });
});

function showQuizResult(pkgType) {
  const recommendations = {
    'starter': 'Flex Desk Placement – Perfect for small teams up to 50 people',
    'pro': 'Managed Enterprise Floor – Best for growing teams 50–500 people',
    'enterprise': 'Campus / HQ Solutions – Ideal for large enterprises 500+ people'
  };

  document.querySelectorAll('.quiz-question').forEach(q => q.style.display = 'none');
  document.getElementById('quiz-recommendation').textContent = recommendations[pkgType] || recommendations['pro'];
  document.getElementById('quiz-result').style.display = 'block';
  track('quiz_completed', { recommendation: pkgType });
}


/* MOBILE APP NOTIFICATION */
document.getElementById('app-notify')?.addEventListener('click', () => {
  const input = document.getElementById('app-email');
  const email = input.value.trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    alert('Please enter a valid email address');
    return;
  }
  captureLead({
    name: 'App waitlist',
    email,
    intent: 'COLD',
    source: 'website_app_waitlist',
    utm: { source: 'website', medium: 'app_waitlist' },
  });
  track('lead_captured', { source: 'website_app_waitlist' });
  alert('Done — we\'ll notify you at ' + email + ' when the app launches.');
  input.value = '';
});

