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

Topology: repo `~/quox-seo` on the warehouse host (dev: <dev-box>), SQLite
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
  `<imap-host>:465`); you never pass a password.
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

- DEPLOYING A SERVER CODE CHANGE (e.g. lib/report.mjs wording, API logic): the
  :3110 server runs in the `quox-quoxseo` DOCKER container with the code BAKED
  into the image (only `~/quox-seo/data` is volume-mounted to /data). So a code
  change is NOT picked up by any restart: commit it, then `quox-build quoxseo`
  to REBUILD the image. The `quox-seo-server.service` user unit is a dormant,
  disabled leftover file, and `systemctl --user restart quox-seo.service` fails
  outright (wrong name AND wrong mechanism). Only the INGEST runs via systemd
  (quox-seo-ingest.timer). Verify after rebuild: `docker exec quox-quoxseo grep
  <new string> /app/lib/report.mjs` AND curl the report endpoint. (2026-10-06:
  a session spent several messages sending the owner to `systemctl restart` a
  non-existent service before finding it was a baked container + `quox-build quoxseo`.)
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
- GSC 403 "User does not have sufficient permission for site '<property>'" is a
  WRONG-PROPERTY-STRING gap, NOT propagation and NOT a bad key (2026-09-26: 3 of
  6 new sites 403'd across TWO full re-ingests on the SAME working key while
  others succeeded). The warehouse defaults gsc_property to `sc-domain:<domain>`
  (a Domain property), but many sites are verified ONLY as URL-PREFIX
  (`https://<domain>/` or `https://www.<domain>/`), and the exact www vs non-www
  differs PER SITE (site A = www, sites B and C = non-www). Diagnose
  CHEAPLY without re-crawling: a standalone pullGsc probe over the candidates
  (`https://<d>/`, `https://www.<d>/`, `sc-domain:<d>`) prints which returns rows.
  Then FIX config-side: `settings set gsc_property <working-string>` for that org,
  then ingest. Do NOT tell the owner to make a Domain property (needs DNS
  re-verify) and do NOT blindly full-re-ingest to re-hit the same 403 (wasted
  crawl, see the no-gsc-only-refresh gap).
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
- DataForSEO IS DRIVABLE end to end (proven live 2026-09-26, closes the World A
  half of quox-seo#2). Credential resolution: vault credential id (settings
  `dataforseo_credential_id`, org-scoped) -> env `QUOXSEO_DATAFORSEO_LOGIN/PASSWORD`
  -> FILE `~/.config/quox/dataforseo.json`. The FILE credential is ORG-AGNOSTIC:
  it works for ANY org, including `org-quox` (which has NO vault credential of its
  own). Drive paid verbs for the real quox.ai warehouse with
  `QUOXSEO_ORG_ID=org-quox QUOXSEO_DB=~/quox-seo/data/quox-seo.db node
  bin/quoxseo.js <verb>`. Set per-org ceilings first:
  `settings set spend_month_ceiling <n>` / `spend_run_ceiling <n>` (defaults 50/1).
  Real costs: `keywords <kw>` ~$0.10 each (single, EXPENSIVE), `gaps <domain>`
  ~$0.02-0.05 (cheap + rich, 100-300 competitor keywords), `rank --set` ~$0.04 for
  a whole tracked set. Balance is checkable free before a run.
- TWO DISCONNECTED WORLDS in quox-seo. World A (CLI verbs
  `keywords`/`rank --set`/`gaps`/`backlinks` -> store.mjs tables) is LIVE and
  proven-paid. World B (the search-universe substrate: `discovery-worker.mjs` +
  `analysis-pipeline.mjs` + territories/demand-graph + substrate-store) has full
  write code but NO entrypoint invokes it, so `terms`/`serp_snapshots`/`serp_results`/
  `serp_questions`/`topic_clusters`/`opportunity_scores`/`recommendations`/
  `search_territories`/`demand_graphs` stay EMPTY (`provider_fetches`=0), and the
  `queue`/`territories`/`graph` verbs + `/search-territories`, `/demand-graphs`,
  `/action-queue`, `/weak-serps` routes return empty until it is wired. NOT broken:
  unwired-by-design pending a World B entrypoint.
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
Beta: dashboard view, DataForSEO keyword/rank/gaps/backlinks (World A, DRIVABLE
+ proven-paid 2026-09-26, budget-gated; a Keyword Manager dashboard tab is in
PR quox#613). Not yet: TSA countersign + public chain mirror, vault JIT for the
GSC key, the World B search-universe substrate (discovery-worker/analysis-pipeline/
territories/demand-graph, code exists but no entrypoint), AI-citation module.
Source of truth:
quox-dashboard/docs/STATUS_AND_LIMITS_QUOXSEO.md.

<!-- >>> tips (generated by sync-quoxpert-tips; do not edit) >>> -->
## Tips users see

Quox shows these one-line tips to users (`quox tips`). Know them so you can point at the right command.

- **Self-host your SEO**: `quox seo status` (stable; shows when: seo)
<!-- <<< tips <<< -->
