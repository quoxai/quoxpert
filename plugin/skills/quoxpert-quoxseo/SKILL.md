---
name: quoxpert-quoxseo
description: Operate QuoxSEO, the witnessed SEO warehouse: read crawl health, GSC performance, orphan/inlink status and the signed change log; verify the WARD chain; run or schedule ingests on the warehouse host. Load when a task touches SEO data for a Quox-managed site, witnessed SEO history, or the quox seo CLI.
license: LicenseRef-SkillRights-Reserved-1.0
---

# Quoxpert: QuoxSEO (the witnessed SEO warehouse)

QuoxSEO joins a daily site crawl + Google Search Console + the internal link
graph into one org-scoped URL warehouse, then WARD-witnesses every crawl on an
append-only chain and diffs consecutive crawls into SIGNED change events.
The pitch in one line: "that deploy noindexed 183 URLs" as a tamper-evident
dated fact, independently verifiable.

Topology: repo `~/quox-seo` on the warehouse host (dev: dev-01), SQLite
warehouse `data/quox-seo.db`, WARD chain `data/ward/chain.json` signed with the
pinned facts Ed25519 key. Read-only API on loopback :3110, reached ONLY through
the collector's governed proxy `/api/v1/quoxseo/*` (entitlement `quoxseo`,
org-forwarded, GET-only). Ingest + witness run from systemd user timer
`quox-seo-ingest.timer` (daily 05:40 UTC), never through HTTP.

MULTI-ORG, MULTI-SITE (do not misread "org-scoped" as single-site; verified in
code 2026-09-22): the warehouse holds many sites across many orgs. Every row is
scoped by `org_id` AND `site_id`; `lib/sites.mjs` validates origins, the backend
exposes `POST /api/v1/sites {origin, gsc_property?, ga4_property?}` (per-org cap
`max_sites`, default 5), and the ingest binary loops `listAllSites()` so the
daily timer crawls EVERY registered site per org. quox.ai is just site_id 1 in
the QUOX DEVELOPMENT org; other orgs (e.g. HostNode) get their own property rows.

REGISTRATION (governed since 2026-09-22, quox#583): site registration is the
ONE governed mutation on this otherwise read-only surface. Use
`quox seo add-site <origin> [--gsc <property>] [--ga4 <property>]` and
`quox seo sites` to list; the write goes through the collector proxy
(entitlement-gated, AEE-witnessed as quox.seo.site_register). NEVER use the
old ungoverned loopback curl on the warehouse host except to bootstrap an
install whose collector predates the fix; it skips entitlement + AEE.
Origin must be PUBLIC (SSRF guard rejects loopback/private). GSC enrichment
needs `gsc_property` set to the EXACT GSC property string plus a
google_service_account credential in that org. Dashboard add-property form
still pending (tracked on quox#583).

## The governed surface (any install, licence-gated)

```
quox seo status              # latest crawl: health, coverage, witness state
quox seo urls --filter orphans|noindex|errors|no-gsc|discovered [--q text] [--sort impressions]
quox seo url /docs/ward      # full latest record for one path
quox seo crawls              # runs + root hashes + ward seq
quox seo changes [--crawl N] # the signed change log
quox seo verify              # recompute chain + signatures + root hashes; exit 1 on any failure
quox seo sites               # the org's registered properties
quox seo add-site <origin> [--gsc <property>] [--ga4 <id>]   # governed, witnessed write
```

A 403 is the licence gate working. "unavailable" means the :3110 backend is not
running on that install's warehouse host.

Dashboard: `/quoxseo` (signed first-party bundle; sidebar under Developers).

## Operator verbs (warehouse host only, ungoverned by design)

```
cd ~/quox-seo
node bin/quoxseo.js ingest    # crawl + GSC + graph + witness, one run (~80s for quox.ai)
node bin/quoxseo.js witness   # catch up any unwitnessed complete crawls
node bin/quoxseo.js verify    # same recomputation as quox seo verify, local
systemctl --user list-timers quox-seo-ingest.timer
journalctl --user -u quox-seo-ingest.service -n 20
```

## Reports: generate and deliver (recipe + the gap, 2026-09-25)

Generate a witnessed SEO report for a site:
```
QUOXSEO_ORG_ID=<org> node ~/bin/quoxseo-report.mjs out.html --pdf
```
It renders HTML + PDF from the warehouse and falls back to the last GOOD crawl
if today's is degraded (verified 2026-09-25: crawl #169 came back 0/1, the
report correctly used the prior 723-URL crawl #161).

Gotchas found by driving it (2026-09-25), each a real trap:
- The generator DEFAULTS to a single hardcoded org (`01KKNKH398...`). Always pass
  `QUOXSEO_ORG_ID` for the site you mean. A wrong/absent org is exactly how a
  quox.ai report gets built for, or addressed to, the wrong tenant.
- The generator only RENDERS. It does NOT send. Delivery is a separate step.
- Emailing is the `email_send` AGENT tool. A bare `quox tool exec email_send`
  fails `invalid agent_id: unknown agent` (a raw session is not an agent). It
  must run under an agent: `quox agent attach <agent>` then
  `quox agent exec <agent> --tool email_send --input '{"to","subject","html"}'`.
  The tool resolves the org's vault `email_account` credential itself (SMTP via
  `plesk.node.network:465`); you never pass a password.
- `seer` (the SEO agent) is NOT granted `email_send`; only the `quoxflow` agent
  is. So sending an SEO report today means attaching as quoxflow, which is wrong
  ergonomics.
- An ad-hoc `email_send` is HELD as a HITL approval (correct for a one-off). The
  approval is org-scoped and may not appear in `quox inbox list` for a different
  identity/org.

TARGET MODEL (owner design, 2026-09-25, NOT built yet, tracked on the QUOXSEO
stream): each asset/site carries report-delivery SETTINGS (recipient(s),
frequency, format). Configuring those settings IS the authorization; a scheduled
server-side send matching the config runs WITHOUT per-send HITL (same shape as
the daily ingest timer). Per-send HITL stays only for ad-hoc/off-config sends.
And SEO-report delivery should belong to `seer` (or be QuoxSEO-native), not
borrow the `quoxflow` grant.

## Gotchas (each found by driving it, not guessed)

- The systemd units pin the nvm node v20 binary: better-sqlite3 is a native
  module and /usr/bin/node (v18) dies with ERR_DLOPEN_FAILED.
- The witness module REFUSES to mint a signing key (pre-commitment, same as
  ops-canary). If `~/.quox-ward/facts/keys` is absent, that is the answer, not
  a bug to work around.
- Change events fire only on SIGNIFICANT fields. bytes/link-count churn and
  daily GSC metrics are deliberately excluded; do not "fix" a quiet change log
  by adding them, that noise decision is load-bearing.
- Sitemap-only crawling produces a WRONG orphan graph; the ingest does a
  one-hop discovery crawl (found day one: /blog/all links every post and is
  not in the sitemap). `--filter discovered` lists pages linked but absent
  from the sitemap, itself a real audit signal.
- GSC credential: vault-first. Set QUOXSEO_GSC_CREDENTIAL_ID (a
  google_service_account credential in the site's org) and the ingest resolves
  it JIT via the auth internal decrypt route (org-checked, lease-gated,
  AEE-audited). The key file (~/.config/quox/gsc-service-account.json, 0600)
  is the bare-host fallback. Never cat either.
- The auth /api wall swallows unauthenticated internal routes with a generic
  401 authentication_required: internal service-key routes live under
  /api/setup/* (mounted before the wall). If a service-key call 401s on a
  /api/... path, you hit the wall, not the route.
- Zero change events across identical crawls is CORRECT behaviour, not a
  broken diff: verify with `quox seo verify` before assuming a fault.
- SOME verbs SPEND real money (DataForSEO), most do not. `keywords <kw>`
  BUYS volume/difficulty/CPC and prints a `run cost $X` / `N bought` line;
  `suggest` and any SERP `--set`/rank refresh also hit the paid API. The FREE
  warehouse verbs read GSC + the local crawl only: `status`, `crawls`,
  `changes`, `striking`, `rank` (day-over-day GSC positions), `geo`, `verify`,
  `url`/`urls`. When the owner says "skip DataForSEO / no credits", DO NOT run
  `keywords`/`suggest`; a session spent ~$0.10 on `keywords brain2` against
  exactly that instruction (2026-09-09). Tell: a `run cost`/`bought` line in
  the output means you just paid, so check for it before assuming a verb is
  free.
- `render <url>` can lie with a FALSE "not JS-dependent" (raw == rendered, +0)
  if the headless render under-executes (too-short wait, a hang, a silent
  Playwright fault) and falls back to the raw HTML. A genuine +0 on a React
  SPA is suspicious. Before trusting non-JS-dependence, sanity-check the run:
  duration should be several seconds (a sub-second render is a red flag),
  rendered links should be >= raw, and re-run once. On 2026-09-06 a session
  reported the quox.ai homepage as "not JS-dependent, 1462/1462" from one such
  under-executed run; the real number was 1462 raw / 1908 rendered (+446
  words, ⚠ JS-DEPENDENT) with 20 links invisible to non-JS/AI crawlers (a
  client-rendered plugin showcase section absent from the prerendered HTML).

## Honest maturity (2026-09-04)

Stable: warehouse ingest, WARD witnessing, change events, verify, CLI, timer.
Beta: dashboard view (new). Not yet: TSA countersign + public chain mirror,
vault JIT for the GSC key, DataForSEO/rank tracking/backlinks/AI-citation
modules (all planned, budget-gated when they land). Source of truth:
quox-dashboard/docs/STATUS_AND_LIMITS_QUOXSEO.md.
