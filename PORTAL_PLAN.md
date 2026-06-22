# BayWorks Customer Portal — Strategy & Build Plan

The customer portal turns the marketing site into a logged-in client experience that
mirrors the CRM pipeline, so corporate clients see the *same deal flow your agents work*
— one source of truth, no WhatsApp-and-spreadsheet chaos.

## Customer
Corporate decision-makers (founder, ops/admin head, facilities lead) sourcing Grade-A /
managed office space. High-stakes, low-frequency buyers who value speed, transparency,
and not being chased by ten brokers.

## The "ultra" customer journey

| # | Stage | Customer goal | Dashboard experience | CRM module |
|---|-------|--------------|---------------------|-----------|
| 0 | Discover | "Can these people help?" | Login / Get-started CTA | `leads` |
| 1 | Onboard | Sign up in <60s | Guided requirement brief | `leads`, `requirements` |
| 2 | Match | Relevant spaces, fast | Curated shortlist + match score | `propertymatch`, `shortlist`, `inventory` |
| 3 | Evaluate | Shortlist, compare | Favorite/reject, notes, compare | `shortlist`, `leaddocuments` |
| 4 | Visit | Book & track visits | Self-serve calendar, status | `calendar`, `scheduler`, `attendance` |
| 5 | Propose | Clear pricing | Proposal/quote viewer | `quotes`, `dealroom` |
| 6 | Negotiate | Align stakeholders | Shared deal room, e-sign | `dealroom`, `approval` |
| 7 | Close | Sign confidently | Lease tracker, invoices | `lease`, `invoice`, `finance` |
| 8 | Move-in | Smooth handover | Fit-out checklist, tickets | `postsales` |
| 9 | Retain/Refer | Renew, expand, refer | Renewals, referral rewards, NPS | `referral`, `engagement`, `alerts` |

Cross-cutting: persistent advisor card (WhatsApp/call), real-time status, proactive
notifications.

## Phased rollout

| Phase | Theme | Scope | Status |
|-------|-------|-------|--------|
| 0 | Demo shell | Login, guarded dashboard, mock data | Done |
| **1** | **One source of truth** | **Portal auth backend, real profile/stats/requirement/shortlist/visits, API layer, fallback** | **Done (this change)** |
| 2 | Engagement | Match scores, save/reject, compare, visit booking, proposals, notifications, PWA | Planned |
| 3 | Ultra concierge | Deal room + e-sign, lease/finance, post-sale, team workspaces, referrals, real-time | Planned |

---

## Phase 1 — what was built

### Backend — CRM `portal` module (`crm/api/src/portal/portal.module.ts`)
Customer-scoped, separate from staff auth. A `PortalAccount` (new Prisma model) is 1:1 with
a `Lead`; tokens carry `scope: 'portal'` and are verified by `PortalJwtGuard` (not passport),
so a customer token can never reach staff `/api/*` routes and vice-versa. Every data query is
filtered by the token's `leadId` (row-level isolation).

| Method | Endpoint | Auth | Returns |
|--------|----------|------|---------|
| POST | `/api/portal/auth/register` | public | `{ accessToken, user }` (find-or-creates the Lead) |
| POST | `/api/portal/auth/login` | public | `{ accessToken, user }` |
| GET | `/api/portal/me` | portal JWT | profile |
| PATCH | `/api/portal/me` | portal JWT | updated profile (syncs Lead name/phone) |
| GET | `/api/portal/summary` | portal JWT | stat cards (requirements, shortlist, visits, proposals) |
| GET | `/api/portal/requirement` | portal JWT | requirement brief summary |
| GET | `/api/portal/shortlist` | portal JWT | shortlisted units (project, area, rate) |
| GET | `/api/portal/visits` | portal JWT | site visits (title, time, status) |

Tenant is resolved by the marketing-site capture token (`cap_…`), falling back to the first
tenant in dev. Passwords hashed with bcrypt. Registered in `app.module.ts`.

### Frontend (marketing site)
- `src/portal-api.js` — typed client for `/crm-api/portal/*`; throws `ApiError`, flags
  `.network` on 5xx/unreachable so callers can fall back (same contract as `crm.js`).
- `src/auth.js` — `register()`/`login()` now **API-first**: hit the CRM, and only fall back
  to the localStorage demo store if the CRM is unreachable. API sessions are tagged
  `mode:'api'`; `isApiSession()` added.
- `src/dashboard.js` — fetches live, customer-scoped data on API sessions; falls back to mock
  on demo/offline sessions or any API failure, so the page never breaks. Output escaped.

### Verification
- Backend: `npx prisma generate` + `npx tsc --noEmit` → clean (exit 0).
- Frontend: `vite build` → clean.
- Offline E2E: demo login with CRM down → login POST returns 500 → auth falls back to local
  demo → dashboard renders mock data, no uncaught errors.

---

## Activating the live path

The live API path is compiled and ready; it switches on automatically once the CRM is up
(no front-end change — `auth.js` already prefers the API).

```bash
cd crm
docker compose up -d                 # Postgres on :5433
cd api
npx prisma migrate dev --name portal_account   # creates the PortalAccount table
npx prisma db seed                   # optional: demo tenant + sample data
npm run start:dev                    # API on :3001/api
```

Then on the marketing site, register a new account at `/login.html` — it creates a real Lead +
PortalAccount in the CRM and the dashboard shows that customer's live, scoped data. (The
`demo@bayworks.in / Demo@1234` account is the *offline* demo; it lives only in localStorage.)

## Architecture decisions / guardrails
- Customer auth is fully separate from staff RBAC; portal tokens are `scope`-gated.
- All portal queries are scoped to the token's `leadId` + `tenantId` — never expose the wider CRM.
- Graceful degradation everywhere: CRM down ⇒ site still works (offline demo).
- Reuse, don't rebuild: dashboard is a *view* over CRM data; reuse `properties-detail.html`,
  `analytics.js`, existing design tokens.

## Next (Phase 2 keystones)
1. Real shortlist save/reject from `/properties.html` (write to `LeadShortlist`).
2. Self-serve site-visit booking (`calendar` + `scheduler`).
3. Proposal viewer (`quotes`) + in-app/WhatsApp notifications (`notification`).
4. 2FA via existing `twofa` module; PWA install.

---

## Delivered (status — 2026-06-22)

Four scope-gated portals on the marketing site, all backed by the CRM via shared services.

**Customer:** requirement brief wizard · live inventory · shortlist (save/remove) · book visit · proposals (accept/decline) · documents vault · editable profile · recent-activity timeline.
**Developer:** projects/units · edit unit availability & rent (live everywhere via Redis cache invalidation) · client demand (anonymised) · site-visit requests + confirm · documents vault · editable profile · activity.
**Channel Partner:** refer a lead · referred-leads + status · commissions + CSV statement · documents vault · editable profile · activity.

**Cross-cutting (shared services):**
- `SharedInventoryService` — single source for property/unit data, Redis-cached, `invalidatePublic` on writes.
- `NotificationsService` — persisted + Redis pub/sub + **SSE** real-time bell; optional `phone` also sends **WhatsApp**.
- `PasswordResetService` (single-use hashed tokens), `MailService` (SMTP + Ethereal dev path), `WhatsAppService` (Meta Cloud API), `TwoFactorService` (TOTP + backup codes), `DocumentsService`, `ActivityService`.

**Security (parity across all 3 portals):** login rate-limiting · password reset (email delivery) · 2FA (TOTP) + backup codes.

**Mediator guarantee:** developers/partners never receive customer phone/email (audited: 0 PII leaks); developer demand/visits are anonymised; all client comms are relayed by BayWorks server-side. Documented as a code contract.

### Product decision — partner referral names (was "C6")
Partners see the **name** of leads *they themselves referred* (deal tracking), never phone/email. Decision: **keep names, do not mask** — masking adds no mediation benefit (no contact info is exposed) and harms the partner's ability to track their own referrals.

### Delivered later — customer team workspaces (was "C5") — 2026-06-22
Multiple customer accounts share one workspace (Lead). Roles OWNER/MEMBER/VIEWER in the JWT, enforced server-side (VIEWER read-only; invite/remove OWNER-only). Tokenised 7-day email invites, accept-invite page, dashboard Team card. Stays inside one client company — mediation boundary untouched.

### Delivered later — backlog cleared — 2026-06-22
- **Developer respond-to-shortlist:** developers respond to anonymised demand with fixed templates (AVAILABLE/TOUR/WAITLIST/UNAVAILABLE) — no free text; BayWorks relays; customer identity never exposed. Customer sees a friendly owner-response label on their shortlist.
- **Automated tests:** `npm run test:suite` — 46-check non-fail-fast suite across all portals + team workspaces + mediator audit.
- **a11y + responsive:** skip-to-content links, global `:focus-visible`, `prefers-reduced-motion`, wrapping control rows on small screens.
- **PWA:** installable (manifest + brand icons) with an offline-capable service worker (network-first navigations → offline fallback; SWR for assets; never caches `/crm-api`).

## Remaining
- **Ops (needs credentials/hosting):** push repos + PRs; set real `SMTP_*` / `WHATSAPP_*`; production config + deploy; remove demo seeds before launch.
- **Considered & deferred:** unify customer vault onto `PortalDocument` (declined — would break staff doc-sharing via `LeadDocument`).
