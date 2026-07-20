# Cloudflare setup — TLS, WAF, DDoS protection

Decision (2026-07-15): Cloudflare's free tier sits in front of every BAYWORKS
domain, decoupled from wherever each service is actually hosted. $0/month.
Gives automatic TLS, always-on DDoS mitigation, and a managed WAF ruleset.

I can't do this part myself — it needs your Cloudflare account and control of
`bayworks.in`'s nameservers at your domain registrar. This is a checklist, not a
big project: expect ~15 minutes plus DNS propagation time (up to 24h, usually
much faster).

## 1. Add the domain to Cloudflare

1. Sign up / log in at [cloudflare.com](https://cloudflare.com) (free plan).
2. **Add a site** → enter `bayworks.in`. Cloudflare scans existing DNS records
   automatically.
3. Cloudflare gives you two nameservers (e.g. `xxx.ns.cloudflare.com`). Go to
   wherever `bayworks.in` is registered and replace the existing nameservers
   with these. This is the one step that needs registrar access — everything
   else happens inside Cloudflare's dashboard.
4. Wait for Cloudflare to show the domain as "Active" (nameserver propagation —
   usually under an hour, can take up to 24h).

## 2. DNS records — recreate the current topology

Per `DEPLOY.md`'s subdomain-split layout, you need these records, all with the
orange cloud **ON** (proxied through Cloudflare, not just DNS-only):

| Type | Name | Target | Proxy |
|---|---|---|---|
| CNAME | `bayworks.in` (root) | your Vercel deployment (`cname.vercel-dns.com` or similar — copy the exact value Vercel's domain settings show you) | Proxied |
| CNAME | `app` | wherever the CRM web/portals end up hosted | Proxied |
| CNAME or A | `crm` | wherever the CRM API ends up hosted | Proxied |

The exact `crm`/`app` targets depend on the CRM API's hosting choice, which
isn't decided yet (see `DEPLOY.md` §2 — still "Node host / container", no
specific provider chosen). Add those two records once that's settled; the root
domain (Vercel) can be done today independent of that.

**Important with Vercel specifically:** Vercel's own SSL cert issuance expects
to see traffic directly, and having Cloudflare proxy in front of it works fine
as long as you set the SSL mode correctly (§3) — this is an extremely common,
well-supported combination, not something unusual.

## 3. SSL/TLS mode

Cloudflare dashboard → **SSL/TLS** → set to **Full (strict)** once the origin
(Vercel / whatever hosts the API) has a valid certificate of its own — which
Vercel always does automatically. If you ever point a record at a host that
doesn't have a real cert yet, use **Full** (not "Flexible" — flexible mode
leaves the Cloudflare-to-origin leg unencrypted, which defeats a chunk of the
point of doing this).

Also enable, same **SSL/TLS** section:
- **Always Use HTTPS** (redirects any `http://` request to `https://`)
- **Automatic HTTPS Rewrites**
- **HSTS** (Edge Certificates tab) — start with a short max-age (e.g. 1 week)
  before committing to a long one; HSTS is hard to safely undo once caches
  pick it up

## 4. WAF — enable the free managed ruleset

Dashboard → **Security → WAF → Managed rules**. Turn on the **Cloudflare
Managed Ruleset** (free tier includes it) — covers common attack signatures
(SQL injection, known CVEs, malformed requests) without you writing custom
rules. Leave it in "Log" mode for a day or two first if you want to confirm it
doesn't false-positive on anything BAYWORKS' own traffic does, then switch
affected rules to "Block".

## 5. Rate limiting (free tier includes a small allowance)

Security → **WAF → Rate limiting rules**. Worth adding one rule now:
throttle `POST /api/auth/login` and the portal login endpoints (already have
app-level lockout per the earlier audit work, but an edge-level rate limit is a
second layer that stops the traffic before it even reaches your server). The
free plan's rate-limiting allowance is limited but sufficient for one or two
rules like this.

## 6. What's already covered vs. what this adds

- The marketing site on **Vercel already has baseline DDoS mitigation and TLS**
  as part of the platform, on every tier including free — this Cloudflare setup
  is additive defense-in-depth for it, not filling a gap that exists today.
- The **CRM API has no such baseline** yet, because its host isn't chosen. Once
  it is, this Cloudflare layer is what actually closes this audit item for it —
  don't skip §2's `crm`/`app` records once that decision is made.

## 7. If you outgrow the free tier

Cloudflare Pro ($20/month per domain) adds custom WAF rules, more rate-limiting
rules, and better analytics. Worth revisiting once there's real customer
traffic/revenue to justify it — not needed to launch.
