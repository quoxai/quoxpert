---
name: quoxpert-deploy
description: "Install, configure, upgrade, back up, and restore a QuoxCORE
  instance: the Docker Compose stack (auth/collector/quoxflow/memory/tasks/
  postgres/qdrant + optional profiles), the Setup Wizard, TLS/nginx, and the
  quox CLI's setup/backup/admin command groups. Load when the user wants to
  stand up a new instance, upgrade one, or manage its backups/health."
argument-hint: "<task, e.g. 'first-time setup' or 'trigger and verify a backup'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard (docker-compose.yml, services/, cli/) + quox-website (DownloadsPage)
    sources:
      - repo: quox-dashboard
        path: "docker-compose.yml (profiles: full, with-n8n, with-screencap)"
      - repo: quox-dashboard
        path: docs/PUBLIC_DEPLOY_RUNBOOK.md
      - repo: quox-dashboard
        cmd: "node cli/bin/quox.js setup|backup|admin|status|doctor --help"
      - repo: quox-website
        path: src/pages/DownloadsPage.jsx (QUICKSTART_STEPS, REQUIREMENTS)
      - repo: quox-dashboard
        path: "services/collector/server.js (GET /install)"
    generated_at: 2026-07-25
    quox_version: ">=0.1 pre-1.0"
license: LicenseRef-SkillRights-Reserved-1.0
---

# Quoxpert: Install, Upgrade, Backup & Deploy

## What this is

QuoxCORE self-hosts as a Docker Compose stack: dashboard (nginx + React,
serves both HTTP and terminates TLS on 443 in production), auth, collector,
quoxflow, memory, tasks, orchestrator, files, postgres, qdrant, plus
optional profile-gated services (`repobrain`, `powers-host`, `n8n`,
`screencap`) that only start with `--profile full` (or their own narrower
opt-in profile). First boot creates the real first admin through the
**Setup Wizard** in the browser, not a seed script. The `quox` CLI's
`setup`/`backup`/`admin`/`status`/`doctor` command groups cover the ongoing
lifecycle: health checks, backup/restore, and platform configuration.

## When (not) to use this sub-skill

Use this when the user wants to: stand up a fresh Quox instance, upgrade an
existing one, trigger/verify/restore a backup, run health diagnostics, or
understand which services/profiles they need.

**Do NOT use this for:**
- Enrolling a *fleet host* (a machine Quox will manage remotely via
  QuoxBastion/quoxagent), that's the bastion skill's `/install` recipe, a
  different install target than the Quox stack itself.
- Building or installing a `.quoxplugin` extension → the plugin-SDK skill.
- Day-to-day CLI operations once the instance is up and healthy (agents,
  workflows, teams) → the CLI-wide skill.
- Anything specific to `q01`/staging-only internal runbooks with pinned
  internal IPs, developer-box paths, or Terminal-9 build queues: those
  are Quox's own dev-team tooling, not something a customer's laptop has.
  If a step only makes sense with a source checkout, it doesn't belong here.

## Install & connect

The real install path (updated 2026-10-14, quox#785). Plan for Docker with
Compose, Git, 8 GB RAM and 30 GB free disk. The installer refuses to start
below 4 GB RAM or 10 GB disk. There are NO prebuilt images yet: every image
is built from source on first run, which takes a while.

    curl -fsSL https://get.quox.ai | sh

The installer clones the PUBLIC release mirror `quoxai/quoxcore` (which
includes QuoxFlow) plus `quoxai/quoxmcp`, generates secrets, builds the stack
and waits for it to report healthy. Manual equivalent:

    git clone https://github.com/quoxai/quoxcore.git quox
    cd quox && ./scripts/setup.sh
    ./scripts/post-install-smoke.sh https://localhost:3000   # verify

Then open `https://localhost:3000` (self-signed cert) and connect at least one
model provider; until one is connected, agents cannot answer.

Do NOT `git clone quoxai/quox && docker compose up -d`. That is the PRIVATE
dev repo, and its compose only works on the dev box: it needs a hand-made
`.env` (POSTGRES_PASSWORD etc.), self-signed certs, the external network
`quox-matrix_default`, absolute `~` build contexts and sibling
checkouts. The public mirror and its `setup.sh` exist to remove exactly
those prerequisites. Maturity: a clean Ubuntu 24.04 install test was still
in progress as of 2026-10-14. Check the quoxcore README "Tested on" line
before calling the installer proven.

The default profile suits a single-tenant/personal instance. Enable the
heavier optional surfaces explicitly when you need them:

    docker compose --profile full up -d      # adds repobrain, powers-host, n8n, screencap

First boot: open the dashboard URL and complete the **Setup Wizard**. This
creates the real first admin account and org. Never type an admin password
into chat with Claude; the wizard (or `quox setup admin`, run interactively
in your own terminal) is the only place that credential should be entered.

    quox setup status                # check whether setup has been completed
    quox status                      # platform health overview once you're auth'd
    quox doctor                      # deeper diagnostics if something looks off

## Command map
<!-- quoxpert:generated:start command-map -->
| Command | Purpose |
|---|---|
| `quox setup status/admin/config` | First-time setup status, create initial admin, configure platform settings |
| `quox setup license activate/link/status/deactivate` | Activate, inspect and release this instance's licence (key paste, no-paste short-code link, entitlement/lease status, seat release) |
| `quox status` / `quox health [name]` / `quox doctor` | Platform health overview / per-service health / diagnostics |
| `quox backup list/get/create/delete/verify/restore/schedule` | Manage backups and backup schedules |
| `quox admin config/key/service/logs/stats/retention` | Platform configuration, API keys, service registry, audit logs, stats, data retention |
| `quox onboard <host>` | Guided, idempotent, resumable wizard to onboard a customer site as a governed Quox tenant |
| `docker compose up -d` / `--profile full up -d` | Start the trimmed default stack / the full stack with dev-heavier services |
<!-- quoxpert:generated:end command-map -->

## Recipes (hand-authored: the actual expertise)

### 1. First-time setup, start to finish
    git clone https://github.com/quoxai/quox.git
    cd quox && docker compose up -d
    # then in a browser: http://localhost:3000 → complete the Setup Wizard
    quox login
    quox setup status

### 2. Check overall platform health
    quox status
    quox health                      # alias for `service health`, all services
    quox health collector            # a single service

### 3. Run diagnostics when something looks off
    quox doctor

### 4. Trigger a backup and verify it actually restores
An untested backup is a hope, not a backup: always pair `create` with
`verify`, and periodically rehearse a `restore`:

    quox backup create
    quox backup list
    quox backup verify <backupId>

### 5. Restore from a backup
    quox backup list
    quox backup restore <backupId> --dry-run    # see what would be restored first
    quox backup restore <backupId>
    # confirm the prompt carefully: this is a destructive-by-nature operation

### 6. Put backups on a schedule
    quox backup schedule create --name nightly --cron "0 3 * * *" --type full --retention 14
    quox backup schedule list

### 7. See what services are registered and their status
    quox admin service list

### 8. Check platform-wide stats and recent admin audit activity
    quox admin stats
    quox admin logs

### 9. Configure a platform setting post-setup
    quox setup config --key <key> --value <value>

### 10. Enable the full profile when you need the extra services
    docker compose --profile full up -d
    docker compose ps                 # confirm repobrain/powers-host/n8n/screencap are now up

### 11. Upgrade an existing instance
    git pull
    docker compose build
    docker compose up -d
    quox status                       # confirm all services report healthy post-upgrade

### 12. Activate or check this instance's licence
    quox setup license activate --key-file <path>        # key JSON from a 0600 file on this instance (instance admin)
    quox setup license activate --stdin                  # or pipe the key JSON in; never touches disk
    quox setup license link                               # or: approve a short code on quox.ai, no key paste
    quox setup license status                              # entitlements, lease expiry, freshness
    quox setup license deactivate                          # release the seat so it can activate elsewhere

### 12b. Licence status and plugin seat bands
    quox licence status [--plugin <id>]                   # licence id, plan, lease, entitled list with seat usage
    quox licence refresh                                  # refresh the lease
    quox licence seats <pluginId>                         # list who holds a band seat, e.g. notesq
    quox licence seats <pluginId> --release-dead          # DRY RUN: holders that are not live orgs (deleted orgs, user: ids)
    quox licence seats <pluginId> --release-dead --yes    # actually free them
    quox licence seats <pluginId> --release <orgId>       # DRY RUN: release a LIVE org seat (its install of the plugin is disabled)
    quox licence seats <pluginId> --release <orgId> --to <orgId2> --yes   # hand the freed seat to another org in the same call

### 13. Onboard a customer site as a governed Quox tenant (`quox onboard`)
A single guided wizard that replaces the manual "create org, add engagement,
verify targets, schedule a recurring scan" sequence. It is idempotent and
resumable: re-running it against the same host picks up where a previous run
left off rather than duplicating state.

    quox onboard client-site.example.com \
      --name "Acme Corp" --repo acme/acme-site \
      --environment-tier production \
      --schedule-cron "0 2 * * 3" --tool vuln_scan

`--target` overrides the scan target if it differs from `<host>`; `--yes`
runs non-interactively, doing every automatable step and printing gate
instructions (e.g. domain verification) instead of pausing for them. Omit
`--yes` on a first run against a new customer so you can review each step.

### 12. Enroll a fleet host from a freshly-set-up instance
That's a different install target: see the bastion skill's `/install`
recipe (`curl .../install | sudo bash` run ON the target host, not on the
Quox box itself).

## Gotchas

- **A new compose env var proves itself with `docker exec <container> printenv <VAR>`, never with a grep of the yml.** The quox-dashboard compose file holds 13+ services and several share similar env blocks (auth and collector both carry MATRIX_* vars); on 2026-08-17 a var was added to the auth block while the code reading it ran in the collector, the rebuild went green, and the feature silently no-oped until printenv on the target container caught it. After any env addition: rebuild, then printenv on the container the READING code runs in.
- **The Setup Wizard, not a seed script, creates the first real admin.**
  Any recipe or doc that references a seed script for a production instance
  is describing a dev-only shortcut that intentionally refuses to run once
  the instance is in production mode.
- **Profiles matter.** Services without a `profiles:` key in Compose always
  start (the trimmed default set). `repobrain`, `powers-host`, `n8n`, and
  `screencap` are gated behind `--profile full` (or their own narrower flag).
  Don't assume they're running just because `docker compose up -d`
  succeeded.
- **A cold collector boot takes time** (background catch-up + schedulers).
  Give the stack ~30-90 seconds after `up -d` before concluding a service is
  unhealthy; check `docker compose ps` / `quox health` rather than judging
  from the first few seconds.
- **Backups are only real once restore-tested.** `backup create` + `verify`
  is the minimum bar; a periodic restore-to-scratch drill is the actual
  acceptance test for anything you'd call production-ready.
- **Never accept or relay an admin password/API key through chat.** Point
  the user at the Setup Wizard, their own terminal for `quox setup admin`,
  or `quox admin key` for API keys: Claude's role here is to tell them
  *which command to run themselves*, not to collect the secret.
- **`docker compose` commands are for the user's own box, not an internal
  build queue.** If you're inside Quox's own dev repo (not a customer
  install), that team uses a centralised build queue instead of raw compose,
  that's an internal-dev-only detail, out of scope for this sub-skill.
- **An env var can be LIVE while absent from every env file you grep.**
  Compose `environment:` lines like `- LICENSE_SIGNING_KEY=${LICENSE_SIGNING_KEY:-}`
  pull from `.env` files compose reads implicitly, from shell exports at
  `up` time, and from override files, and different services on one box read
  DIFFERENT env files. When auditing whether an instance has a key/flag set,
  probe the RUNNING container (`docker exec <c> sh -c 'echo ${#VAR}'` prints
  only the length, never the value) instead of grepping files. A 2026-09-04
  licence DD concluded a prod signing key was absent by checking the wrong
  env file; the key had been live via the compose seam since 2026-08-08 and
  the wrong conclusion nearly caused a needless key rotation against live
  licences.

## Lessons: hotfix-line deploys to prod (QUOXCHAT-BRUTALOOP, 2026-10-11)
1. A canary must check the BUILD result, not the container's health. A failed image build leaves the OLD container running and healthy, so "auth: healthy" after a failed build means nothing; a script gated on health alone rolls on to the next service with new files on disk and old code running. Gate on the build exit code, then on health.
2. Check free disk before any image build (>= 3 GB). Prod hit 100% (208 MB free) and both apt-get and npm ci failed mid-hotfix with ENOSPC; it surfaced as a generic exit 100.
3. Every hotfix that tags a `prerollback` image keeps that image's layers alive; prune superseded rollback tags once the next hotfix is verified (13 tags, about 5 GB on prod).
4. When disk fills, check the app's own backup retention first. backup-quox.sh could not delete its own run dirs (root-owned qdrant-data copied by a throwaway container while the job runs as uid 1001) and swallowed the error: 250 runs, 37 GB. Fixed on main (f8d455736, 76f11a6eb) and patched into prod's copy; the proof is the next nightly logging "removed N old backup dir(s)".
6. When a conflict resolution on the hotfix line takes the INCOMING side, grep the resolved hunk for every identifier it calls and confirm each is defined on the hotfix line. Hotfix 9 (2026-10-11) nearly shipped a widget error path calling main-only `emitStatus()` and assigning an undeclared `turnFailed`: a ReferenceError inside the dropped-connection handler. The jsdom runtime smoke test cannot catch it because it never runs that path; only reading the hunk does. Also grep the full hotfix diff for known main-only symbols (configResolver, buildOverrideSystemPrompt, GLASS_, quoxchatCompatLlm, emitStatus).
5. Generate each hotfix with a parity check (prod files equal the expected base), payload md5 verification against the branch, and a printed rollback. When a hotfix fails AFTER installing files, write a rebuild-only script that verifies the installed md5 instead of re-running it (its parity check will rightly refuse).
