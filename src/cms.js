/* ── CMS: shared defaults + helpers ─────────────────────────── */

export const CMS_KEY = 'bayworks_cms';

// Single source of truth for instant-quote pricing (₹ per sq ft / month).
// The quote dropdown + price math both read from here, so they can never drift.
export const QUOTE_PRICES = {
  Gurugram:  85,
  Mumbai:    95,
  Bengaluru: 65,
  Hyderabad: 55,
};

// Mock/sample brand logos (fictional) — used as defaults and the admin "sample logos" button
export const MOCK_LOGOS = [
  { name: 'Nexora',      logo: '/logos/nexora.svg' },
  { name: 'Vertex Labs', logo: '/logos/vertex.svg' },
  { name: 'Quantia',     logo: '/logos/quantia.svg' },
  { name: 'Lumio',       logo: '/logos/lumio.svg' },
  { name: 'Aerith',      logo: '/logos/aerith.svg' },
  { name: 'Stratus',     logo: '/logos/stratus.svg' },
  { name: 'Novacorp',    logo: '/logos/novacorp.svg' },
  { name: 'Finlytic',    logo: '/logos/finlytic.svg' },
];

export const DEFAULTS = {
  // Hero
  hero_badge:   'Live across 12 Cities + Dubai',
  hero_h1_1:    'Corporate Leasing,',
  hero_h1_2:    'Without the Headache.',
  hero_sub:     'Grade-A offices across India and Dubai — 100% owner-verified shortlist delivered to your desk within 48 hours.',

  // Metrics strip
  metric_1_val:   '120k+',  metric_1_label: 'Sq. Ft. closed in a single deal',
  metric_2_val:   '40%',    metric_2_label: 'Avg. lease liability reduction',
  metric_3_val:   '0%',     metric_3_label: 'CapEx on managed fit-outs',
  metric_4_val:   '7 days', metric_4_label: 'Fastest deal closure on record',

  // Pain points
  pain_heading:   '3 Headaches Every Procurement Team Faces',
  pain_1_title:   'The Vendor Runaround',
  pain_1_desc:    'Five different local brokers blasting you with unverified, outdated listings — forcing you to waste weekends on site visits that match nothing in your brief.',
  pain_2_title:   'The Cash Burn',
  pain_2_desc:    'Massive upfront CapEx on interior fit-outs, lock-ins, and security deposits that trap your company\'s cash flow and bloat the balance sheet.',
  pain_3_title:   'The Scaling Trap',
  pain_3_desc:    'Signing a strict 3–5 year legacy lease, only to find your headcount doubles in 12 months — leaving you stuck with expensive, unutilised space.',

  // Solutions
  sol_1_title:    'Zero-CapEx Managed Spaces',
  sol_1_desc:     'We specialise in sourcing fully custom-fitted office configurations where the developer covers the entire fit-out cost. Switch your real estate from a heavy balance sheet liability to a predictable monthly OpEx.',
  sol_1_tag:      'Balance Sheet Optimisation',
  sol_2_title:    '48-Hour Filtering Protocol',
  sol_2_desc:     'Give us your headcount, budget, and location. Within 48 hours you receive a curated, 100% owner-verified shortlist. No dummy listings. No wasted site visits.',
  sol_2_tag:      'Speed to Decision',
  sol_3_title:    'Agility Built Into Every Lease',
  sol_3_desc:     'We structure flexible locking terms and expansion clauses — allowing your workspace configurations to expand or contract seamlessly as your business scaling dynamics evolve.',
  sol_3_tag:      'Future-Proof Leasing',
  sol_4_title:    'In-House Legal & Due Diligence',
  sol_4_desc:     'Our legal team clears title deeds, land usage certificates, and maintenance agreements before you sign. Procurement doesn\'t inherit surprise legal hassles or hidden charges.',
  sol_4_tag:      'Risk Elimination',

  // About
  about_headline: 'We\'re Your Extended Infrastructure Team.',
  about_p1:       'At Billionaires Bay Global Realty LLP, we don\'t act like traditional brokers. We understand that your job isn\'t just to "find an office" — it is to optimise a P&L, protect corporate capital, and deliver a seamless transition for your employees.',
  about_p2:       'Whether your immediate mandate is a Grade-A managed enterprise floor, a highly flexible coworking setup, or an outright commercial acquisition — we\'ve re-engineered the corporate leasing process to solve your core operational bottlenecks.',

  // Testimonials
  test_1_quote:   '"BAYWORKS turned what would have been a 60-day sourcing nightmare into a 48-hour delivery. The verified shortlist saved us from the usual broker spam."',
  test_1_name:    'Madhav Kumar',
  test_1_role:    'VP, Operations — Tech Startup',
  test_2_quote:   '"Zero CapEx managed spaces completely restructured our real estate P&L. We went from balance-sheet heavy to pure OpEx in one lease cycle."',
  test_2_name:    'Rajesh Singh',
  test_2_role:    'CFO — Manufacturing Group',
  test_3_quote:   '"Having a single point of contact across Mumbai, Bangalore, and Gurugram meant our expansion actually stayed on schedule. No more city-to-city broker chaos."',
  test_3_name:    'Neha Patel',
  test_3_role:    'Head of Real Estate — Financial Services',
  // Real-person photos (data URLs, set from the admin panel; empty = show initials)
  test_1_photo:   '',
  test_2_photo:   '',
  test_3_photo:   '',

  // Clients
  clients_label:  'Trusted by Leading Teams Across',
  clients_list:   JSON.stringify(MOCK_LOGOS),

  // Available Properties (editable mock listings) — managed from admin
  properties_list: JSON.stringify([
    { name: 'Cyber City Tower A',  city: 'Gurugram',  size: '12,000 sq ft', bucket: '5k-20k sqft',  price: '₹95/sq ft/mo',  type: 'Managed Floor', status: 'Available', featured: true },
    { name: 'BKC Premier',         city: 'Mumbai',    size: '8,500 sq ft',  bucket: '5k-20k sqft',  price: '₹140/sq ft/mo', type: 'Grade-A',       status: 'Available' },
    { name: 'Outer Ring Hub',      city: 'Bengaluru', size: '25,000 sq ft', bucket: '20k-50k sqft', price: '₹78/sq ft/mo',  type: 'Managed Floor', status: 'Available' },
    { name: 'HITEC Signature',     city: 'Hyderabad', size: '4,200 sq ft',  bucket: '0-5k sqft',    price: '₹65/sq ft/mo',  type: 'Coworking',     status: 'Available' },
    { name: 'Golf Course Ext.',    city: 'Gurugram',  size: '55,000 sq ft', bucket: '50k+ sqft',    price: '₹88/sq ft/mo',  type: 'Campus / HQ',   status: 'Hot Deal',  featured: true },
    { name: 'Powai Tech Park',     city: 'Mumbai',    size: '18,000 sq ft', bucket: '5k-20k sqft',  price: '₹110/sq ft/mo', type: 'Grade-A',       status: 'Available', featured: true },
  ]),

  // FAQ
  faq_1_q:  'How quickly can we get a verified shortlist?',
  faq_1_a:  'We deliver a curated, 100% owner-verified shortlist within 48 hours of receiving your brief. No dummy listings, no wasted site visits.',
  faq_2_q:  'What does "zero CapEx" actually mean?',
  faq_2_a:  'It means the developer covers all interior fit-out costs. You move in with a ready-to-use space and pay only operational rent — no balance sheet heavy upfront CapEx.',
  faq_3_q:  'Can we expand or downsize mid-lease?',
  faq_3_a:  'Yes. We structure flexible locking terms and expansion clauses into every lease, so your workspace configurations can scale with your business.',
  faq_4_q:  'Who handles legal and due diligence?',
  faq_4_a:  'Our in-house legal team clears title deeds, land usage certificates, and all agreements before you sign. Procurement doesn\'t inherit legal surprises.',
  faq_5_q:  'What\'s the typical deal closure timeline?',
  faq_5_a:  'From shortlist to signature-ready terms: 7–14 days on average. Our fastest closure on record is 21 days, including legal clearance.',
  faq_6_q:  'Do you cover all 12 cities equally?',
  faq_6_a:  'Yes. We have dedicated on-ground teams across North, West, and South India, plus Dubai. Single point of contact, everywhere you need to be.',

  // Pricing
  price_1_title: 'Flex Desk Placement',
  price_1_desc:  'For small teams up to 50 seats. Plug-and-play coworking spaces, fully managed.',
  price_1_f1:    'Up to 50 seats',
  price_1_f2:    '48-hour shortlist',
  price_1_f3:    'Zero CapEx fit-outs',
  price_1_f4:    'Month-to-month flexibility',
  price_2_title: 'Managed Enterprise Floor',
  price_2_desc:  'For growing teams of 50–500 seats. Grade-A floors, dedicated fit-outs, concierge support.',
  price_2_f1:    '50–500 seats',
  price_2_f2:    'Custom-fitted spaces',
  price_2_f3:    'Developer-funded CapEx',
  price_2_f4:    'Flexible lease terms (2–5 yrs)',
  price_2_f5:    'Ongoing facility optimization',
  price_3_title: 'Campus / HQ Solutions',
  price_3_desc:  'For enterprises 500+ seats. Multi-floor, multi-city portfolios. Bespoke structuring.',
  price_3_f1:    '500+ seats across cities',
  price_3_f2:    'Multi-floor coordination',
  price_3_f3:    'Legal structuring & negotiation',
  price_3_f4:    'Ongoing portfolio management',

  // Process
  proc_1_title: 'Intake & Brief',
  proc_1_desc:  'Share your headcount, budget, and location preferences. 30-minute call, no jargon.',
  proc_2_title: '48-Hour Shortlist',
  proc_2_desc:  'Receive a verified, curated list of Grade-A options. Only properties that match your brief.',
  proc_3_title: 'Site Visits & Selection',
  proc_3_desc:  'Walk properties with our team. Narrow down to your top 2–3 choices. No broker spam.',
  proc_4_title: 'Legal & Due Diligence',
  proc_4_desc:  'Our legal team clears title, usage rights, and terms. You see a clean, signature-ready agreement.',
  proc_5_title: 'Move-In & Optimization',
  proc_5_desc:  'Handover, fit-out coordination, ongoing support. We stay with you post-signature.',

  // Case Studies
  case_1_industry:   'Tech Startup',
  case_1_company:    'Rapid-Scale SaaS Unicorn',
  case_1_challenge:  'Headcount tripled in 6 months. Old lease locked them into 8,000 sq ft. Faced massive overage costs and broker delays.',
  case_1_m1_val:     '7 days',
  case_1_m1_label:   'Closure to lease signature',
  case_1_m2_val:     '₹35L/mo',
  case_1_m2_label:   'Monthly cost reduction',
  case_2_industry:   'Manufacturing',
  case_2_company:    'Global Operations HQ',
  case_2_challenge:  'Consolidating 4 regional offices into one. 3 different brokers = chaos. Legal disputes = delays.',
  case_2_m1_val:     '₹2.5Cr',
  case_2_m1_label:   'Total CapEx avoided',
  case_2_m2_val:     'Zero',
  case_2_m2_label:   'Legal surprises',
  case_3_industry:   'Financial Services',
  case_3_company:    'Global Trade Desk',
  case_3_challenge:  'Expansion across 5 Indian cities in parallel. Needed flawless execution, single point of contact.',
  case_3_m1_val:     '5 cities',
  case_3_m1_label:   'Launched simultaneously',
  case_3_m2_val:     '1 POC',
  case_3_m2_label:   'For all real estate needs',

  // Team
  team_1_name:  'Vikram Sharma',
  team_1_title: 'Co-Founder & CEO',
  team_1_bio:   '15+ years in institutional real estate. Built portfolios for 50+ Fortune 500 companies across India.',
  team_2_name:  'Priya Desai',
  team_2_title: 'Co-Founder & COO',
  team_2_bio:   'Legal expert, real estate law specialist. Clears complex title deeds and regulatory hurdles.',
  team_3_name:  'Rajesh Kumar',
  team_3_title: 'VP, Vendor Relations',
  team_3_bio:   'Direct relationships with 200+ property owners. Unlocks off-market inventory daily.',

  // Contact / CTA
  whatsapp_num:   '919205005399',
  cta_headline:   'Take the Work Off Your Desk.',
  cta_body:       'Send us your rough headcount or area requirement. We\'ll deliver a clean market availability matrix to your inbox by next morning.',
  cta_footnote:   'Are you open to a brief, 5-minute introductory alignment call? We\'re usually available same-day.',

  // Footer
  footer_tagline: 'Corporate Leasing & Workspace Advisory',
  footer_legal:   'Billionaires Bay Global Realty LLP',
  footer_copy:    '© 2025 Billionaires Bay Global Realty LLP. All Rights Reserved.',

  // ═════════════════════════════════════════════════════════════
  // SPRINT 2: FEATURES 9–22 (Content Placeholders)
  // ═════════════════════════════════════════════════════════════

  // Feature 9: Virtual Tours
  virt_tours_title: '360° Virtual Tours',
  virt_tours_desc:  'Walk through properties in immersive 3D before scheduling a site visit. Saves your team 10+ hours of commute time.',

  // Feature 10: Floor Plans
  floor_plans_title: 'Interactive Floor Plans',
  floor_plans_desc:  'Detailed CAD layouts with zone mapping, desk counts, and breakout areas. Export for your space planning team.',

  // Feature 11: E-Signature
  esign_title: 'Digital Lease Signing',
  esign_desc:  'Sign leases electronically with legally-compliant e-signatures. Cut paperwork cycle from 14 days to 2 hours.',

  // Feature 12: Document Library
  doc_lib_title: 'Compliance Document Hub',
  doc_lib_desc:  'Access templates, regulatory docs, compliance checklists, and property certifications in one secure vault.',

  // Feature 13: Property Alerts
  alerts_title: 'Real-Time Property Alerts',
  alerts_desc:  'Get notified instantly when new properties match your criteria. Never miss an opportunity in your market.',

  // Feature 14: Video Consultation
  video_consult_title: 'Live Video Walkthroughs',
  video_consult_desc:  'Real-time video calls with property managers. See spaces, ask questions, get instant answers — no travel needed.',

  // Feature 15: Market Analytics
  market_analytics_title: 'Market Analytics & Trends',
  market_analytics_desc:  'Real-time pricing data, occupancy trends, and lease agreement terms across your cities. Make data-driven decisions.',

  // Feature 16: Financing
  financing_title: 'Flexible Financing Options',
  financing_desc:  'Lease structuring, payment plans, and deposit alternatives. Work with your cash flow, not against it.',

  // Feature 17: Referral
  referral_title: 'Partner Referral Program',
  referral_desc:  'Refer a corporate client and earn recurring commissions. Passive income for your network.',

  // Feature 18: Whitepapers
  wp_title: 'Industry Whitepapers',
  wp_desc:  'Exclusive research on corporate real estate trends, cost optimization, and market outlook for 2025-2026.',

  // Feature 19: Advanced Filtering
  filter_title: 'AI-Powered Search Filters',
  filter_desc:  'Filter by budget, location, amenities, parking, connectivity, and sustainability rating. Find your perfect fit in seconds.',

  // Feature 20: Portfolio Tracker
  portfolio_title: 'Lease Portfolio Dashboard',
  portfolio_desc:  'Track all active leases, renewal dates, and expiring contracts across your corporate footprint in one dashboard.',

  // Feature 21: Compliance
  compliance_title: 'Automated Compliance Tracking',
  compliance_desc:  'Automatic reminders for regulatory filings, property certifications, and lease renewal timelines.',

  // Feature 22: Sustainability
  sustain_title: 'ESG & Sustainability Ratings',
  sustain_desc:  'See green certifications, carbon footprint, and ESG compliance for every property. Align your real estate with corporate values.',

  // ═════════════════════════════════════════════════════════════
  // TIER 3: COMING SOON FEATURES (Roadmap)
  // ═════════════════════════════════════════════════════════════

  tier3_f1_title: 'AI Property Matching',
  tier3_f1_desc:  'ML-powered recommendations based on your company DNA',

  tier3_f2_title: 'Predictive Analytics',
  tier3_f2_desc:  'Forecast market trends 6 months ahead',

  tier3_f3_title: 'Advanced Reporting',
  tier3_f3_desc:  'Custom dashboards and BI integration',

  tier3_f4_title: 'API Integration',
  tier3_f4_desc:  'Sync with your ERP, HCM, and finance systems',

  tier3_f5_title: 'Global Expansion',
  tier3_f5_desc:  'Coverage expanding to Singapore, HK, London',

  tier3_f6_title: 'Tenant Communities',
  tier3_f6_desc:  'Network with 500+ corporate tenants',

  tier3_f7_title: 'White Label Solutions',
  tier3_f7_desc:  'Reseller program for brokers & advisors',

  tier3_f8_title: 'Enterprise Customization',
  tier3_f8_desc:  'Custom workflows for your org',
};

export function loadCMS() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(CMS_KEY) || '{}') };
  } catch { return { ...DEFAULTS }; }
}

export function saveCMS(data) {
  localStorage.setItem(CMS_KEY, JSON.stringify(data));
}

export function applyCMS() {
  const d = loadCMS();
  document.querySelectorAll('[data-cms]').forEach(el => {
    const key = el.dataset.cms;
    if (d[key] !== undefined) el.textContent = d[key];
  });
  // Apply uploaded images (e.g. testimonial photos) — empty value keeps the fallback
  document.querySelectorAll('[data-cms-img]').forEach(el => {
    const val = d[el.dataset.cmsImg];
    if (val) {
      el.src = val;
      el.closest('.testimonial-avatar')?.classList.add('has-photo');
    }
  });
  // Update WhatsApp hrefs
  const waNum = d.whatsapp_num;
  document.querySelectorAll('[data-cms-wa]').forEach(el => {
    el.href = `https://wa.me/${waNum}`;
  });
  // Render client logos from list
  const clientsContainer = document.getElementById('clients-track-dynamic');
  if (clientsContainer && d.clients_list) {
    try {
      // Supports both legacy strings ('TCS') and objects ({ name, logo })
      const clients = JSON.parse(d.clients_list)
        .map(c => (typeof c === 'string' ? { name: c, logo: '' } : c));
      const render = (c) => {
        const name = (c.name || '').replace(/"/g, '&quot;');
        return c.logo
          ? `<div class="client-logo client-logo--img"><img src="${c.logo}" alt="${name}" loading="lazy" /></div>`
          : `<div class="client-logo">${(c.name || '').replace(/\n/g, '<br>')}</div>`;
      };
      const html = clients.concat(clients) // duplicate for seamless loop
        .map(render).join('');
      clientsContainer.innerHTML = html;
    } catch(e) { console.error('Failed to parse clients_list:', e); }
  }
  // ── Available properties: cards, booking dropdown, quote pricing ──
  const esc = (s) => String(s ?? '').replace(/"/g, '&quot;');
  const PIN_SVG = '<svg aria-hidden="true" style="vertical-align:-0.125em" class="lucide lucide-map-pin" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>';
  const RULER_SVG = '<svg aria-hidden="true" style="vertical-align:-0.125em" class="lucide lucide-ruler" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></svg>';

  let props = [];
  try { props = JSON.parse(d.properties_list || '[]'); }
  catch (e) { console.error('Failed to parse properties_list:', e); }

  // Expose for the detail modal (main.js reads window.__BAYWORKS_PROPS[idx])
  window.__BAYWORKS_PROPS = props;

  let favs = [];
  try { favs = JSON.parse(localStorage.getItem('bayworks_favorites') || '[]'); } catch { favs = []; }
  const HEART_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';

  const propsGrid = document.getElementById('properties-grid');
  if (propsGrid) {
    const waNum = d.whatsapp_num || '919205005399';
    propsGrid.innerHTML = props.map((p, i) => {
      const search = `${p.name} ${p.city} ${p.type}`.toLowerCase();
      const statusSlug = (p.status || 'Available').toLowerCase().split(' ')[0];
      const isFav = favs.includes(p.name);
      const priceNum = parseFloat((String(p.price).replace(/,/g, '').match(/[\d.]+/) || [0])[0]) || 0;
      const sqftNum  = parseFloat((String(p.size).replace(/,/g, '').match(/[\d.]+/) || [0])[0]) || 0;
      const img = p.image
        ? `<div class="property-img"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" /></div>`
        : `<div class="property-img property-img--empty">${PIN_SVG}<span>${esc(p.city || 'Property')}</span></div>`;
      const waMsg = encodeURIComponent(`Hi BAYWORKS, I'm interested in "${p.name || 'a property'}" (${p.city || ''}). Please share details.`);
      return `<article class="property-card${isFav ? ' is-fav' : ''}" data-idx="${i}" data-name="${esc(p.name)}" data-city="${esc(p.city)}" data-size="${esc(p.bucket)}" data-price="${priceNum}" data-sqft="${sqftNum}" data-search="${esc(search)}" tabindex="0" role="button" aria-label="View ${esc(p.name)}">
        <button type="button" class="fav-btn" data-fav="${esc(p.name)}" aria-label="Save ${esc(p.name)}" aria-pressed="${isFav}">${HEART_SVG}</button>
        ${img}
        <div class="property-body">
          <span class="property-status status--${statusSlug}">${p.status || 'Available'}</span>
          <h3>${p.name || ''}</h3>
          <p>${PIN_SVG} ${p.city || ''}</p>
          <p>${RULER_SVG} ${p.size || ''} · ${p.type || ''}</p>
          <div class="property-price">${p.price || ''}</div>
          <div class="property-actions">
            <button type="button" class="btn-primary btn-sm" data-action="book" data-idx="${i}">Book Tour</button>
            <a class="btn-ghost btn-sm" data-action="wa" href="https://wa.me/${waNum}?text=${waMsg}" target="_blank" rel="noopener">WhatsApp</a>
          </div>
        </div>
      </article>`;
    }).join('');
    // Re-run filters if the page has them wired up
    if (typeof window.filterProperties === 'function') window.filterProperties();
  }

  // #4 — Booking property dropdown sourced from the live inventory
  const bookingSelect = document.getElementById('booking-property');
  if (bookingSelect && props.length) {
    bookingSelect.innerHTML = props.map(p =>
      `<option data-city="${esc(p.city)}">${esc(p.name)} — ${esc(p.city)} (${esc(p.size)})</option>`
    ).join('');
  }

  // Featured Projects — curated cards that link into the listing
  const featuredGrid = document.getElementById('featured-grid');
  const featuredSection = document.getElementById('featured');
  if (featuredGrid) {
    const featured = props.map((p, i) => ({ p, i })).filter(x => x.p.featured);
    if (featured.length) {
      featuredGrid.innerHTML = featured.map(({ p, i }) => {
        const statusSlug = (p.status || 'Available').toLowerCase().split(' ')[0];
        const img = p.image
          ? `<div class="featured-img"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" /></div>`
          : `<div class="featured-img featured-img--empty">${PIN_SVG}<span>${esc(p.city || 'Project')}</span></div>`;
        return `<article class="featured-card" data-idx="${i}" tabindex="0" role="button" aria-label="View ${esc(p.name)}">
          ${img}
          <div class="featured-body">
            <span class="property-status status--${statusSlug}">${p.status || 'Available'}</span>
            <h3>${p.name || ''}</h3>
            <p>${PIN_SVG} ${p.city || ''}${p.type ? ` · ${p.type}` : ''}</p>
            <div class="featured-foot">
              <span class="property-price">${p.price || ''}</span>
              <span class="featured-link">View details &rarr;</span>
            </div>
          </div>
        </article>`;
      }).join('');
      if (featuredSection) featuredSection.style.display = '';
    } else if (featuredSection) {
      featuredSection.style.display = 'none';
    }
  }

  // #8 — Quote city dropdown + pricing from the single QUOTE_PRICES source
  const quoteCity = document.getElementById('quote-city');
  if (quoteCity) {
    quoteCity.innerHTML = '<option value="">Select city</option>' +
      Object.entries(QUOTE_PRICES).map(([city, price]) =>
        `<option data-price="${price}">${city}</option>`
      ).join('');
  }
}
