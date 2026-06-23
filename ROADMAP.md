# BAYWORKS — Roadmap

Confirmed backlog (agreed 2026-06-23). Done items live in git / PORTAL_PLAN.md;
this file tracks what's planned and at which stage.

## Decided architecture
- **Subdomain split** — `bayworks.in` = marketing landing page, `app.bayworks.in`
  = the three portals (customer / developer / channel-partner) + CRM web.
  Decision recorded; execution happens at deploy (see DEPLOY.md §3).

## In progress / done now
- [x] **Preview image (OG)** — branded `public/og-image.jpg`, correct absolute
  paths, OG + Twitter tags on home/about/properties/property-detail.

## Planned — pre-launch
- [ ] **SEO finalize** — commit `robots.txt` + `sitemap.xml` (already drafted),
  confirm footer links to all public pages, keep portals `noindex`. (Quick.)
- [ ] **Subdomain split execution** — move the portal pages to `app.bayworks.in`,
  set CORS / cookie domain / `VITE_CRM_BASE`, update internal links + robots.

## Planned — at launch
- [ ] **Cookie consent banner** — accept/reject, stores choice, gates analytics.
  Needs: target compliance (GDPR / India DPDP) to set reject behaviour.
- [ ] **PostHog product analytics** — `posthog-js`, autocapture + key events
  (signup, login, shortlist, book-visit), loaded **only after consent**.
  Needs: PostHog account + project API key; cloud (US/EU) vs self-host.

## Planned — post-launch
- [ ] **Onboarding checklist** — first-run guided checklist on the customer
  dashboard (complete profile → set requirement → shortlist → book a visit).

## Still blocked on credentials/hosting (from DEPLOY.md)
- [ ] Push repos + open PRs (needs GitHub repos / `gh` auth).
- [ ] Real `SMTP_*` / `WHATSAPP_*` values.
- [ ] Production deploy + secrets.
- [ ] Remove demo seeds before go-live (destructive; on explicit go).
