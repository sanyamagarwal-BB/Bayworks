# BAYWORKS — CI/CD

Two equivalent pipelines ship with the repo:

| Platform | File | Runs on |
|---|---|---|
| GitLab CI | [.gitlab-ci.yml](.gitlab-ci.yml) | a GitLab remote / mirror |
| GitHub Actions | [.github/workflows/ci.yml](.github/workflows/ci.yml) | this repo, every push & PR |
| GitHub Pages deploy | [.github/workflows/deploy.yml](.github/workflows/deploy.yml) | push to `main` (unchanged) |

Both build the monorepo: `/` (marketing site, Vite), `crm/web` (React + Vite + tsc, Playwright e2e), `crm/api` (NestJS + Prisma, smoke/suite tests).

## The three execution modes (from the Ultimate Guide to CI/CD)

| Mode | GitLab | GitHub Actions | In this pipeline |
|---|---|---|---|
| **Sequential** | `stages:` order | `needs:` chains | `lint → build → test → deploy` |
| **Parallel** | jobs in one stage | jobs with no `needs` | `lint:web` + `lint:api` + `security:audit` run together |
| **Out of order (DAG)** | `needs:` | `needs:` | `build:web` waits only on `lint:web`, **not** `lint:api` — it starts the moment its own dependency is done |

## Pipeline graph

```
lint:    lint-web      lint-api      security-audit     (all parallel)
            │             │
build:  build-web     build-api     build-site          (DAG via needs)
            │             │
test:    e2e-web   smoke-api suite-api*                 (parallel, real Postgres)
                          │
deploy:  pages  +  deploy-production (manual gate)       (sequential, main only)
```

### Tests run for real

Each test job starts a **Postgres service** and boots the seeded API through
one shared script — [crm/api/scripts/ci-bootstrap.sh](crm/api/scripts/ci-bootstrap.sh):

```
prisma migrate deploy → npm run seed → nest build → node dist/main.js & → wait :6002
```

- **e2e-web** (blocking) — boots the API on `:6002`, Playwright starts the web
  app on `:6001` (vite proxies `/api` → `:6002`), runs `auth/leads/inventory/quotes`
  specs against the seeded admin (`admin@bayworks.test`).
- **smoke-api** (blocking) — `portal-smoke.mjs` against the seeded customer /
  developer / partner portal logins.
- **suite-api** (\*non-blocking) — `portal-suite.mjs`; it deliberately trips the
  login throttle, so a re-run within ~60s shows expected early failures.

The seed ([crm/api/prisma/seed.ts](crm/api/prisma/seed.ts)) now creates the
portal demo graph the tests assert against — a fixed capture token
(`cap_ohlt1p4glsp`), a customer `PortalAccount` on a lead with phone
`7744905480`, and pre-approved developer / partner accounts.

CI env (non-secret test values): `DATABASE_URL`, `JWT_SECRET=ci-test-secret`,
`PORT=6002`, `CORS_ORIGIN=http://localhost:6005,http://localhost:6001`.

## What each row of the proposal maps to

1. **Type-check stage** — `lint:web` / `lint:api` run `tsc --noEmit` (parallel).
2. **Build stage** — `build:site` / `build:web` / `build:api` (parallel).
3. **Test stage** — Playwright e2e + API smoke + API suite (parallel).
4. **DAG wiring** — `needs:` so builds/tests start as early as possible.
5. **Caching** — `node_modules` keyed on each `package-lock.json`.
6. **Deploy stage** — `pages`, sequential, `main` only, after build+test.
7. **Manual production gate** — `deploy:production` (`when: manual` / `workflow_dispatch` + `environment: production`).
8. **Path rules** — GitLab `rules:changes` skip CRM jobs when only marketing files change (and vice-versa).
9. **Security scan** — `npm audit --audit-level=high`, parallel with lint.

## Known issues

- **Migration history doesn't replay from scratch.** `prisma migrate deploy` on
  a fresh DB fails at `20260621105235_partner_developer_accounts` with
  `relation "Developer" does not exist` — the committed migrations diverged from
  the schema as the local DB was built incrementally. The CI bootstrap therefore
  uses `prisma db push --force-reset` (materialises `schema.prisma` directly),
  which is correct for an ephemeral CI database. **Follow-up:** repair the
  migration chain (squash to a clean baseline) so `migrate deploy` works for real
  production deploys.

## Notes

- `e2e-web` and `smoke-api` are **blocking**; `suite-api` is non-blocking only
  because it intentionally exercises the login throttle. To make it blocking,
  split the throttle section into its own run or reset the limiter between
  sections.
- `ANTHROPIC_API_KEY` is optional — AI features fall back to heuristics when
  unset, so the tests pass without it.
- To run the same flow locally: `docker compose up -d` in `crm/`, then
  `DATABASE_URL=… JWT_SECRET=… bash crm/api/scripts/ci-bootstrap.sh`.
