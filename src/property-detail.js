/* BAYWORKS — Property detail page controller.
 * Reads ?unitId= from the URL, loads the matching unit from the SAME public
 * inventory source the listing uses (loadInventory → /public/inventory), and
 * renders it. Visit requests go through the shared lead-capture (captureLead),
 * so this page works in dev and prod (env-driven base + graceful fallback).
 */
import { loadInventory } from './inventory-api.js';
import { captureLead, flushLeadQueue } from './crm.js';

const params = new URLSearchParams(window.location.search);
const unitId = params.get('unitId') || '';

const skeletonEl = document.getElementById('skeleton-wrap');
const detailEl   = document.getElementById('detail-wrap');
const notFoundEl = document.getElementById('not-found-wrap');

const showNotFound = () => { skeletonEl.style.display = 'none'; notFoundEl.style.display = 'block'; };
const showDetail   = () => { skeletonEl.style.display = 'none'; detailEl.style.display = 'block'; };

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function formatPrice(pricePerSqft, areaSqft) {
  if (!pricePerSqft || !areaSqft) return null;
  const monthly = Math.round(pricePerSqft * areaSqft);
  if (monthly >= 100000) return '₹' + (monthly / 100000).toFixed(1) + 'L/mo';
  return '₹' + monthly.toLocaleString('en-IN') + '/mo';
}

/* ── Render unit ──────────────────────────────────────────────── */
function render(unit) {
  const pageTitle = esc(unit.projectName || unit.name || 'Property') +
    (unit.city ? ' — ' + esc(unit.city) : '') + ' | BayWorks';
  document.title = pageTitle;
  document.getElementById('og-title')?.setAttribute('content', pageTitle);
  document.getElementById('og-description')?.setAttribute('content',
    'Grade-A ' + esc(unit.type || 'office space') + ' in ' + esc(unit.city || 'India') + '. ' +
    (unit.areaSqft ? esc(unit.areaSqft) + ' sq ft. ' : '') + 'Book a visit with BayWorks today.');

  /* Image */
  const imgWrap = document.getElementById('detail-image-wrap');
  const src = unit.image || (Array.isArray(unit.images) && unit.images[0]);
  imgWrap.innerHTML = src
    ? `<img class="detail-image" src="${esc(src)}" alt="${esc(unit.projectName || unit.name)}" />`
    : `<div class="detail-image-placeholder">${esc((unit.projectName || unit.name || 'BW').substring(0, 2).toUpperCase())}</div>`;

  /* Badges */
  let badges = '';
  if (unit.type)       badges += `<span class="badge badge-type">${esc(unit.type)}</span>`;
  if (unit.city)       badges += `<span class="badge badge-city">${esc(unit.city)}</span>`;
  if (unit.status)     badges += `<span class="badge badge-status">${esc(unit.status)}</span>`;
  if (unit.floor)      badges += `<span class="badge badge-floor">Floor ${esc(unit.floor)}</span>`;
  if (unit.furnishing) badges += `<span class="badge badge-floor">${esc(unit.furnishing)}</span>`;
  document.getElementById('detail-badges').innerHTML = badges;

  /* Title + developer */
  document.getElementById('detail-title').textContent = unit.projectName || unit.name || 'Office Space';
  const devParts = [];
  if (unit.developer) devParts.push('By ' + unit.developer);
  if (unit.city) devParts.push(unit.city);
  document.getElementById('detail-developer').textContent = devParts.join('  •  ');

  /* Stats */
  const stats = [];
  if (unit.areaSqft) stats.push({ label: 'Area', value: unit.areaSqft + ' sq ft' });
  else if (unit.size) stats.push({ label: 'Area', value: unit.size });
  if (unit.pricePerSqft) stats.push({ label: 'Rate', value: '₹' + unit.pricePerSqft + '/sq ft/mo' });
  else if (unit.price) stats.push({ label: 'Rate', value: unit.price });
  if (unit.type) stats.push({ label: 'Type', value: unit.type });
  if (unit.furnishing) stats.push({ label: 'Furnishing', value: unit.furnishing });
  if (unit.floor) stats.push({ label: 'Floor', value: unit.floor });
  if (unit.developer) stats.push({ label: 'Developer', value: unit.developer });
  document.getElementById('detail-stats').innerHTML = stats.map((s) =>
    `<div class="stat-card"><div class="stat-label">${esc(s.label)}</div><div class="stat-value">${esc(s.value)}</div></div>`).join('');

  /* Description */
  document.getElementById('detail-desc').textContent = unit.description ||
    `Grade-A ${unit.type || 'office space'} located in ${unit.city || 'India'}. This space is available for immediate occupation with full BayWorks advisory support including legal due diligence and lease structuring at zero extra cost.`;

  /* Amenities */
  let amen = unit.amenities;
  if (amen) {
    if (typeof amen === 'string') { try { amen = JSON.parse(amen); } catch { amen = amen.split(',').map((a) => a.trim()); } }
    if (Array.isArray(amen) && amen.length) {
      document.getElementById('amenities-heading').style.display = 'block';
      document.getElementById('detail-amenities').innerHTML = amen.map((a) => `<span class="amenity-tag">${esc(a)}</span>`).join('');
    }
  }

  /* Booking card */
  const pricePerSqft = parseFloat(unit.pricePerSqft) || 0;
  const areaSqft = parseFloat(String(unit.areaSqft || '').replace(/[^0-9.]/g, '')) || 0;
  if (unit.pricePerSqft) {
    document.getElementById('book-price').textContent = '₹' + unit.pricePerSqft;
    document.getElementById('book-price-unit').textContent = '/ sq ft / mo';
  } else if (unit.price) {
    document.getElementById('book-price').textContent = unit.price;
    document.getElementById('book-price-unit').textContent = '';
  }
  const estimateEl = document.getElementById('book-estimate');
  const monthly = formatPrice(pricePerSqft, areaSqft);
  estimateEl.innerHTML = monthly ? `Estimated monthly: <strong>${esc(monthly)}</strong>` : 'Contact us for pricing details.';

  /* WhatsApp link */
  const waMsg = encodeURIComponent(
    `Hi BayWorks, I'm interested in:\n• Property: ${unit.projectName || unit.name || unitId}` +
    `\n• City: ${unit.city || '—'}\n• Area: ${unit.areaSqft ? unit.areaSqft + ' sq ft' : (unit.size || '—')}` +
    `\n\nPlease share availability and schedule a visit.`);
  document.getElementById('book-wa').href = 'https://wa.me/919205005399?text=' + waMsg;

  showDetail();
  return unit;
}

/* ── Load the unit from the shared public inventory ───────────── */
let current = null;
async function loadUnit() {
  if (!unitId) { showNotFound(); return; }
  const items = await loadInventory(); // array, or null if CRM unreachable
  if (!items) { showNotFound(); return; }
  const unit = items.find((u) => String(u.id) === String(unitId) || String(u.unitId) === String(unitId));
  if (!unit) { showNotFound(); return; }
  current = render(unit);
}

/* ── Visit request → shared lead capture (creates a CRM lead) ──── */
document.getElementById('visit-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submit-btn');
  const successEl = document.getElementById('form-success');
  const errorEl = document.getElementById('form-error');
  successEl.style.display = 'none'; errorEl.style.display = 'none';
  btn.disabled = true; btn.textContent = 'Sending…';

  const propName = current?.projectName || current?.name || unitId;
  const res = await captureLead({
    name: document.getElementById('v-name').value.trim(),
    phone: document.getElementById('v-phone').value.trim(),
    email: document.getElementById('v-email').value.trim(),
    city: current?.city || '',
    budget: propName,
    intent: 'WARM',
    source: 'property_detail_visit',
    utm: {
      source: 'website', medium: 'property_detail', property: propName, unitId,
      preferredDate: document.getElementById('v-date').value || '',
      message: document.getElementById('v-msg').value.trim() || '',
    },
  });

  // captureLead never throws — it queues offline. Treat a queued lead as success
  // for the user (it'll be retried), only show error on an explicit failure.
  if (res && res.ok === false && !res.queued) {
    errorEl.style.display = 'block';
  } else {
    successEl.style.display = 'block';
    e.target.reset();
  }
  btn.disabled = false; btn.textContent = 'Request a Visit';
});

/* "Book a Visit" button scrolls down to the contact form. */
document.querySelector('.btn-book')?.addEventListener('click', () => {
  document.getElementById('contact-form-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

flushLeadQueue();
loadUnit();
