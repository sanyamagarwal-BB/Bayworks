# Data breach response runbook

What to do if BAYWORKS systems (marketing site, CRM, customer/partner/developer
portals) are compromised or personal data is exposed, lost, or accessed without
authorization.

**Status: drafted, not yet operational.** This runbook is only useful once the
placeholders in [§5](#5-named-owners--fill-these-in) are filled in with real people
who will actually pick up the phone during an incident. Until then, treat this as a
plan, not a working process.

## 1. What counts as a "personal data breach"

Any of the following, whether accidental or malicious:

- Unauthorized access to the database (Neon Postgres), a staff account, or an admin
  session
- Loss or theft of a device/backup containing customer, lead, partner, or developer
  data
- A misconfigured system (e.g. a public S3-style bucket, a debug endpoint) exposing
  personal data
- A vendor/sub-processor (WhatsApp, email, AI, storage) breach affecting data
  BAYWORKS shares with them
- Ransomware or destructive malware affecting any system holding personal data
- A staff member accessing or exporting data outside their authorized role

If in doubt, treat it as a breach and start this runbook — it's cheap to stand down
once confirmed, expensive to move slowly on a real one.

## 2. Legal obligations — what actually applies today

India has **two separate, independent** breach-reporting regimes. Both can apply to
the same incident. Neither replaces the other.

| Regime | In force now? | Deadline | Who you notify |
|---|---|---|---|
| **CERT-In Directions** (IT Act 2000, April 2022 rules) | **Yes, already in force** | **6 hours** from detection | CERT-In (India's national CERT) |
| **DPDP Act 2023 / DPDP Rules 2025, Rule 7** | **Not yet — commences 13 May 2027** | "Without delay" to the Board, detailed report within 72 hours; affected individuals notified "without delay" | Data Protection Board of India + affected Data Principals |

**What this means in practice right now (mid-2026):** the CERT-In 6-hour reporting
duty is real and binding today for any cybersecurity incident, independent of
whether personal data was involved. The DPDP Board-notification duty is not yet
legally enforceable — it phases in on **13 May 2027** — but building the operational
muscle for it now means BAYWORKS isn't scrambling to invent a process nine months
before the deadline. Notifying affected individuals promptly and transparently is
good practice regardless of what's legally mandatory on a given date, and is the
part of this runbook worth treating as live starting today.

Penalty for failing to report under DPDP once it's in force: up to ₹200 crore per
incident. CERT-In non-compliance carries potential liability under the IT Act.

Sources: [DPDP Rules 2025 notification — PIB](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190655), [Rule 7 breach notification — dpdpa.com](https://www.dpdpa.com/dpdparules/rule7.html), [CERT-In vs DPDP dual obligations — ksandk.com](https://ksandk.com/data-protection-and-data-privacy/cert-in-vs-dpdp-dual-breach-notification-duties-explained/), [DPDP 72-hour rule breakdown — ComplyZero](https://www.complyzero.com/blog/data-breach-notification-india)

## 3. First 24 hours — immediate response checklist

1. **Contain.** Rotate any exposed credentials immediately (`JWT_SECRET`, DB
   password, API keys — see `crm/api/.env`). If a specific staff account is
   compromised, disable it (`User` row) and bump every affected `PortalAccount`'s
   `tokenVersion` to invalidate existing sessions (the mechanism already exists —
   see [`portal-auth`](crm/api/src/portal-auth/)).
2. **Don't destroy evidence.** Don't wipe/rebuild a compromised system before
   capturing logs, DB state, and timestamps. Neon's point-in-time recovery
   (see `crm/RUNBOOK-BACKUPS.md`) can produce a snapshot of exactly what the
   database looked like at any point — take one before making further changes.
3. **Assess scope.** Which table(s)/records were exposed? Use the
   [DSAR module](crm/api/src/dsar/dsar.module.ts) (`/dsar/search`,
   `/dsar/:leadId/export`) to identify exactly which people are affected once you
   know which lead/account records were touched — this is the fastest path from
   "we think X was exposed" to "here is the exact list of affected individuals,"
   which every notification obligation below requires.
4. **Log a timeline as you go** — when the incident started (if known), when it
   was detected, who was notified internally and when, what containment actions
   were taken and when. You will need this for both CERT-In and any future DPDP
   report, and reconstructing it after the fact is much harder than logging it live.
5. **Start the CERT-In clock.** The 6-hour window starts at detection, not at
   confirmation. If it looks credible, report it — CERT-In can be updated as the
   picture clarifies.

## 4. Notification content

### To CERT-In (within 6 hours of detection)

Technical incident report: what system, what vulnerability/vector, indicators of
compromise, systems affected, actions taken so far. CERT-In wants forensic/technical
detail, not consumer-facing language.

### To the Data Protection Board (once Rule 7 is in force, 13 May 2027 onward — but a reasonable template to have ready)

- Nature and extent of the breach — what data, how much, which categories of
  people
- Timing and location — when it occurred, when detected, where in the systems
- Likely impact on affected individuals
- Remedial measures taken or planned

### To affected individuals (do this regardless of the legal deadline, as soon as scope is known)

Plain language, not legal/technical language:

- What happened, in one or two sentences
- What personal data was involved (be specific — "your name and phone number,"
  not "certain data")
- What BAYWORKS is doing about it
- What the person can do to protect themselves (e.g. "watch for phishing calls
  referencing your BAYWORKS enquiry")
- A real contact — name/email/phone, not a no-reply address (this is where the
  Grievance Officer contact from item 8 gets used)

Deliver via the same channel BAYWORKS already has for that person — portal
notification (`PortalNotification`), email, or WhatsApp, per whatever contact
info they're on file with.

## 5. Named owners — fill these in

This runbook does nothing until real people are attached to these roles. This is
the part I can't fill in — it needs a decision from BAYWORKS' actual leadership.

| Role | Who | Contact | Responsibility |
|---|---|---|---|
| Incident Commander | _[fill in]_ | _[fill in]_ | Owns the response end-to-end, makes the call on scope/severity |
| Technical Lead | _[fill in]_ | _[fill in]_ | Containment, forensics, Neon PITR snapshot, credential rotation |
| Legal / Grievance Officer | _[fill in — see item 8]_ | _[fill in]_ | CERT-In report, DPDP Board report (once live), affected-individual notification content, regulatory contact point |
| Comms | _[fill in]_ | _[fill in]_ | Drafts/sends the affected-individual notification, handles any press/customer inquiries |

## 6. After the incident

- Root-cause writeup — what happened, why, what let it happen
- Track remediation items to closure, not just "we'll fix it"
- If it involved a vendor (WhatsApp, email, AI provider, hosting), review that
  relationship — was their security posture adequate
- Update this runbook with anything that didn't work the first time
