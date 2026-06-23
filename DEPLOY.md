# BAYWORKS — Deployment Guide

Production runbook for the marketing site + the CRM (API, web, datastores).
Everything secret is driven by env vars — see the two `.env.example` files
(`./.env.example` for the marketing site, `crm/api/.env.example` for the API).

## Topology

```
                ┌──────────────────────┐
   visitors ───▶│  Marketing site      │  static (Vite build → dist/)
                │  bayworks.in         │  Vercel / Netlify / any static host
                └──────────┬───────────┘
                           │  browser calls VITE_CRM_BASE
                           ▼
                ┌──────────────────────┐
   portals  ───▶│  CRM API (NestJS)    │  :3001, prefix /api
                │  crm.bayworks.in/api │  Node host / container
                └─────┬──────────┬─────┘
                      ▼          ▼
              ┌────────────┐ ┌────────────┐
              │ PostgreSQL │ │   Redis    │   (cache + SSE pub/sub)
              └────────────┘ └────────────┘

   staff    ───▶  CRM web (React/Vite)  crm.bayworks.in   (separate static build)
```

The marketing site is the **only** thing the public hits. The three portals
(customer / developer / channel-partner) live on the marketing site but talk to
the CRM API. BayWorks is always the mediator: developers/partners never receive
customer contact details (enforced server-side; see `npm run test:suite`).

---

## 1. Datastores

Postgres 16 + Redis 7. For a quick container setup reuse `crm/docker-compose.yml`
(dev ports 5433/6380) or point `DATABASE_URL` / `REDIS_URL` at managed services
(RDS/Aurora, ElastiCache, Upstash, etc.). Redis is **required** — it backs the
shared inventory cache and the real-time notification stream (SSE).

## 2. CRM API

```bash
cd crm/api
cp .env.example .env          # then fill the PROD values below
npm ci
npx prisma migrate deploy     # apply migrations (NOT migrate dev)
npm run build                 # nest build → dist/
node dist/main.js             # or: pm2 / systemd / container CMD
```

**Production env that MUST change from the examples:**

| Var | Why |
|-----|-----|
| `JWT_SECRET` | Rotate to a long random value. Server refuses to start without it. |
| `DATABASE_URL` / `REDIS_URL` | Point at managed Postgres/Redis. |
| `CORS_ORIGIN` | Set to the marketing site origin, e.g. `https://bayworks.in` (only needed if the browser calls the API cross-origin — see §3 option A). |
| `PORTAL_WEB_ORIGIN` | The marketing site's https origin. Used to build **password-reset and team-invite** email links. Wrong value = broken links. |
| `APP_URL` | API public origin incl. `/api` (webhook callbacks). |
| `NODE_ENV` | `production`. |

**To actually send email + WhatsApp (A2):**
- Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Until
  set, mail is logged to the console (dev) — links still work, they just aren't
  delivered.
- WhatsApp: `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` (Meta Cloud API). Until set,
  WhatsApp relays are skipped (in-app + email notifications still fire).

## 3. Marketing site

> **Chosen layout (2026-06-23): subdomain split** — `bayworks.in` serves the
> marketing landing page; `app.bayworks.in` serves the three portals + CRM web.
> The portals currently live inside the marketing build as `*.html` pages, so the
> split is executed at deploy: either deploy the same build to both hosts and let
> each domain show its slice, or split the portal pages into their own deployment.
> Because the two domains are cross-origin, use **Option A (CORS)** below
> (`VITE_CRM_BASE=https://crm.bayworks.in/api`, `CORS_ORIGIN` listing
> `https://app.bayworks.in`). See ROADMAP.md → "Subdomain split execution".

Static build. The one decision is **how the browser reaches the CRM API**:

**Option A — cross-origin + CORS (simplest, no hardcoded host):**
1. Set build env `VITE_CRM_BASE=https://crm.bayworks.in/api`.
2. Set `CORS_ORIGIN=https://bayworks.in` on the API.
3. `npm ci && npm run build` → deploy `dist/`.

**Option B — same-origin rewrite (no CORS):** proxy `/crm-api/*` to the API at
the edge. Keep `VITE_CRM_BASE=/crm-api` and add a rewrite. For Vercel, add to
`vercel.json` (destination can't use env vars, so hardcode the API host):

```json
"rewrites": [
  { "source": "/crm-api/:path*", "destination": "https://crm.bayworks.in/api/:path*" }
]
```

`vercel.json` is already present (build command, security headers, `/admin`
redirect). Set the env vars from `./.env.example` in the host dashboard;
`VITE_CRM_TARGET` is dev-only and not needed in production.

### PWA note
The site is installable (`public/manifest.webmanifest`) with an offline-capable
service worker (`public/sw.js`). The SW **never caches `/crm-api`**, so portal
data stays live and per-user. Service workers require **HTTPS** in production
(works on `localhost` in dev).

## 4. CRM web (staff app)

Separate React/Vite app under `crm/web` (default dev port 5180). Build and host
it at `crm.bayworks.in`; point `VITE_CRM_WEB_URL` (marketing site) at its
`/login`. See `crm/CLAUDE.md` for its build details.

---

## Pre-launch checklist

- [ ] Rotate `JWT_SECRET`; set all PROD env vars in §2/§3.
- [ ] `npx prisma migrate deploy` ran against the prod DB.
- [ ] HTTPS on both origins (required for the PWA service worker and secure cookies).
- [ ] CORS or rewrite wired (§3) — test a portal login end-to-end.
- [ ] SMTP set and a real password-reset / team-invite email arrives.
- [ ] WhatsApp creds set (optional) and a test relay arrives.
- [ ] `npm run test:suite` (in `crm/api`) is green against staging.
- [ ] **A4 — remove demo seeds** before go-live (demo accounts + mock listings).
      This is destructive; run it deliberately once the above is verified.
- [ ] Confirm the mediator guarantee in staging: developer/partner responses
      carry no customer phone/email (the suite asserts this).
