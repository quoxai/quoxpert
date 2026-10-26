---
name: quoxpert-cli
description: "Operate QuoxCORE from the terminal with the quox CLI and TUI:
  auth, agents, workflows, skills/crystals, triggers, memory, HITL inbox,
  traces, budgets. Load when the user wants scripted/terminal control of a
  Quox instance or is automating Quox in CI."
argument-hint: "<task, e.g. 'approve inbox item' or 'export workflow'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard (cli/)
    sources:
      - repo: quox-dashboard
        path: CODEBASE_MAP.md#cli-commands-quoxcli
      - repo: quox-dashboard
        path: cli/lib/api/endpoints.js
      - repo: quox-dashboard
        cmd: "node cli/bin/quox.js --help"
    generated_at: 2026-10-26
    quox_version: ">=0.1 pre-1.0"
license: LicenseRef-SkillRights-Reserved-1.0
---

# Quoxpert: CLI & TUI

## What this is

> **STANDING RULING (owner, 2026-08-23): the CLI is the DEFAULT reach-back, over
> MCP, always.** On a dev server the CLI is already there: `quox dev enable`
> installs /opt/quoxcli and an env-wired /usr/local/bin/quox wrapper, so a
> resident can drive Quox with zero setup. MCP is opt-in for shell-less Claudes
> (see `quoxpert-mcp`), never installed by default, because 85 tool schemas is
> 10-20k tokens of every session's context whether or not a tool is ever called.

`quox` is the terminal client for a QuoxCORE instance (Node ≥20; bins `quox` and `quoxcli`,
package `quoxcli`). Everything the dashboard does with clicks, the CLI does with commands, same
auth, same RBAC, same governance (destructive ops still route to the HITL inbox for approval).
Running with no arguments launches an interactive Ink TUI (`quox tui`); every command also works
non-interactively for scripting.

## When to use this sub-skill

- The user wants to script/automate Quox (CI, cron, shell pipelines).
- The user is on a box with Quox source or a shell but no MCP server configured.
- You need `--json`/`--quiet` machine-readable output to compose with `jq`/other tools.
- The user wants a fast terminal walkthrough (login → org → agent → workflow → inbox).

## When NOT to use this sub-skill

- Chat-driven fleet ops from inside Claude, wielding tools directly → `quoxpert-mcp`.
- Building `.quoxplugin` extensions → `quoxpert-plugin-sdk`.
- Platform orientation / "what is Quox" → `quoxpert-core`.
- Deep workflow-engine internals (node taxonomy, AOCL pipeline) → `quoxpert-flow`.

## Install & connect

    npm install -g quoxcli          # NOT YET REAL: quoxcli is not npm-published (verified 2026-08-22, npm 404; publish is owner-gated).
                                    # On a DEV-ENABLED fleet host you do not need it: `quox dev enable` installs /opt/quoxcli from the
                                    # collector-served bundle and writes an env-wired /usr/local/bin/quox wrapper (devServerRefresh.js).
                                    # Elsewhere, run from a repo checkout: `node <checkout>/quox-dashboard/cli/bin/quox.js` (runs on
                                    # node 18 despite engines >=20). Bundle staleness gotcha: the served tarball is gitignored and
                                    # rebuilt only by cli/deploy/bundle.sh by hand; a freshness test in the collector suite fails
                                    # when it is missing modules (quox#455 gap 3).
    quox login --email you@example.com --password '...'   # or omit flags for prompts
    quox whoami                     # confirms session + active org
    quox doctor                     # verifies collector + services are reachable

Session tokens are written to `~/.config/quox/config.json` (0600 permissions) under a named
**profile**: never ask the user to paste a token; tell them to run `quox login` themselves.
Multiple instances (local/staging/production) are separate profiles:

    quox config profile add staging --url https://staging.quox.ai
    quox config profile use staging
    quox --profile production status     # or -p, one-shot override

### Unattended daemons: use their OWN key, never the shared login

A long-running process that shells `quox` (a bridge, supervisor, sampler, cron)
inherits `~/.config/quox/config.json`'s **active profile** — a mutable global that
whichever session logged in last controls. When it drifts to an unauthenticated
or wrong-org identity, the daemon silently breaks (this took down the Discord
bridge and a resident supervisor on 2026-09-04). Give such a process its OWN
scoped service key and force it:

    QUOX_SERVICE_KEY=qmcp_...  QUOX_ORG_ID=<org>  QUOX_FORCE_SERVICE_KEY=1  quox fleet exec ...

`QUOX_FORCE_SERVICE_KEY=1` makes the CLI send `X-Service-Key` and ignore any
stored session (default precedence is stored-token-wins, the #404 fix, so a bare
`QUOX_SERVICE_KEY` loses to whatever profile is active — that is the trap). It is
opt-in: interactive `quox login` on a dev box is unaffected. Alternatively pin
`-p <own-profile>` with a self-login. Rule: unattended + shells `quox` ->
credential independence, never the ambient active profile.

**Agents on a dev box: drive `quox -p resident`, never a password profile.**
A RESIDENT profile (Ed25519, `kind: resident`, no password) has NO server-side
session row and re-authenticates via a signed challenge on every 401 — it never
churns. A PASSWORD profile (e.g. `moo`/`estop-drive`) mints a session that a
logout-all or password rotation revokes, which permanently kills its refresh
token and dead-ends into an interactive `quox login` an agent cannot run. That
is the "logging in every 5 minutes for the agent" failure (2026-09-10): the
agent drove a dead password session while the human re-logged-in a *different*
profile. If a command dead-ends with `session_revoked`, the CLI now names the
resident profile to switch to (auth.js `residentProfileHint`) — take that hint,
do not ask the human to log in. Re-auth a dropped resident with
`quox -p resident login --resident` (no password).

## Command map

<!-- quoxpert:generated:start command-map -->
| Command | Purpose |
|---|---|
| `quox admin` | Platform administration: config get, config set, enforcement list, enforcement break-glass, enforcement clear, agent-identity mint, email status, email setup, email test, key list, key create, key delete, key test, service list, logs, stats, retention config, retention cleanup, retention stats |
| `quox aee` | Agent Envelope Exchange protocol: store, get, query, conversations, stats |
| `quox agent` | Manage agents: list, get, create, update, delete, activate, deactivate, tool list, tool assign, tool revoke |
| `quox assistant` | Manage assistants: list, get, create, update, delete, deploy, fork |
| `quox login` | Authenticate with QuoxCORE: (no subcommands) |
| `quox logout` | End current session: (no subcommands) |
| `quox whoami` | Show current user and session info: (no subcommands) |
| `quox signup` | Create a new user account: (no subcommands) |
| `quox mfa` | Manage multi-factor authentication: setup, verify, disable, backup-codes |
| `quox account` | Your own account (password, session): password |
| `quox backup` | Manage backups: list, get, create, delete, verify, restore, schedule list, schedule create, server create, server status, server list, server download, server restore, server restore-status |
| `quox brain` | Query Quox Brain2 (vaults, notes, semantic search): search, status, usage, vaults, note |
| `quox budget` | Manage quoxflow spend/usage budgets (org, objective, execution, iteration scope): list, get, create, update, delete, usage |
| `quox build` | QuoxBuild: dispatch and inspect governed builds on dev servers: dispatch, status, targets, history, latest |
| `quox chat` | Chat with CommanderQ or any agent, streaming by default: (no subcommands) |
| `quox chat-status` | Check chat service status: (no subcommands) |
| `quox config` | Manage CLI configuration and profiles: profile list, profile add, profile use, profile remove, get, set |
| `quox consent` | Manage data processing consent: list, grant, history |
| `quox conversation` | Manage conversations: list, get, search, stats |
| `quox department` | Manage departments within divisions: list, create, update, delete |
| `quox dev` | Manage dev-mode (DEVSUITE) fleet hosts: enable, skills status, skills sync, skills accept, sessions list, sessions new, sessions send, sessions pane, sessions kill, doctor |
| `quox resident` | Deploy/reboot a full interactive claude session as a dev host\'s resident (governed tmux + slots, no ssh): deploy, status, reboot, retire, seed |
| `quox supervisor` | Headless runner: answer a resident\'s slot channel with no interactive session open: run, install, uninstall, turns, status |
| `quox discord [args...]` | Quox Discord Pro daemon: status |
| `quox doctor` | Run platform health diagnostics: (no subcommands) |
| `quox domain` | Manage org domain verification (team+ — DNS ownership proof): list, add, verify, remove |
| `quox done` | Quox DoneEngine: is this actually done, and what is the evidence?: check [subject], board, bar [pack], history [pack], packs, fetch |
| `quox engagement` | QUOX-SECURITY: engagement/scope objects (Phase 0 substrate, no scanning capability yet): create <name>, list, show <id>, set-gripe-target <id>, add-target <id> <type> <value>, verify-target <id> <targetId>, check-policy <id> <targetValue> <capabilityRisk>, scan <id> <target> <tool>, discover-ports <id> <hostTarget>, tools, scan-async <id> <target> <tool>, job <jobId>, jobs <id>, report-finding <id> <targetValue> <title> <description>, findings <id>, verify-finding <findingId> <verdict>, resolve-finding <findingId>, report <id>, issue <findingId>, propose <findingId>, schedule create <engagementId> <target> <tool>, schedule list <engagementId>, schedule show <scheduleId>, schedule update <scheduleId>, schedule enable <scheduleId>, schedule disable <scheduleId>, schedule delete <scheduleId>, sync-issues <id> |
| `quox entity` | Manage entities in the knowledge graph: list, get, create, delete, search, relate, unrelate |
| `quox facebook` | Facebook Pages publishing (organic): governed, HITL-approved via Inbox-Q: post, pages, posts, insights, lead-forms, leads |
| `quox file` | Manage files: list, upload, download, delete, stats |
| `quox fleet` | Fleet monitoring and management: status, summary, agents, hosts, gpu, tools, exec, host-update <hostId>, codex-provision <hostId>, rehome-agent <hostId>, watch |
| `quox governance` | Governance: policies, WARD chain, VOLT evidence + certification: policy list, policy get, policy pending-approvals, policy create, policy update, policy delete, policy validate, policy history, template list, template show, template conflicts, template enable, approval resolve, ward status, ward chains, ward entries, ward verify, evidence, traces, certify, cert get, cert for-run, cert list, cert stats |
| `quox gripe` | File a one-liner complaint as a GitHub issue (via the GRIPE agent): (no subcommands) |
| `quox inbox` | Manage inbox and approval requests: list, get, respond, stats |
| `quox instagram` | Instagram publishing and monitoring (organic): governed, HITL-approved via Inbox-Q, on the shared Meta credential: publish, accounts, media, insights, comments, reply, quota |
| `quox integration` | DEPRECATED: alias of `quox vault` — kept for existing scripts: list, get, create, update, delete, test |
| `quox linkedin` | LinkedIn publishing: governed, HITL-approved via Inbox-Q: post, comment, posts, org |
| `quox llm-policy` | View, set, and dry-run-validate the org LLM routing policy: get, set, test |
| `quox llm` | LLM provider status and failover: status |
| `quox memory` | Manage memories: list, get, create, update, delete, search, stats, export |
| `quox mon` | Monitoring: Docker fleet, Wazuh security, AGH-chain leaderboard, metrics: docker fleet, docker containers, docker container, docker logs, docker stats, docker stacks, docker df, docker action, wazuh status, wazuh agents, wazuh alerts, wazuh vulns, wazuh deploy-history, wazuh deploy-agent, wazuh deploy-bulk, wazuh active-response, agh-chain leaderboard, agh-chain agent, agh-chain events, metrics, config get, config cache, config grafana |
| `quox monitoring` | Platform health and governance incidents: health, incidents list, incidents get |
| `quox notification` | Manage notification settings: channels list, channels set |
| `quox nucleus` | Ask the codebase a question (RepoBrain, governed and audited): (no subcommands) |
| `quox objective` | Manage objectives (autonomous multi-step goals): create, list, get, start, approve, checkpoints, approve-checkpoint, deny-checkpoint, halt |
| `quox onboard <host>` | Guided, idempotent, resumable wizard to onboard a customer site as a governed Quox tenant: (no subcommands) |
| `quox open` | Open a quox:// URI in the dashboard or show CLI equivalent: (no subcommands) |
| `quox org` | Manage organizations: list, get, create, update, delete, switch, members list, members add, members update, members remove, divisions list, divisions create, divisions update, divisions delete, audit |
| `quox plan` | QuoxPlan: roadmaps, streams, phases, plans, timeline (governed proxy to the QuoxPlan server): roadmaps, roadmap create, list [roadmap], focus [roadmap], show <streamId>, timeline [roadmap], status <id> <status>, note <id> <text...>, phase <streamId> <verb> [rest...], plan <id>, move <roadmap> <id> <position>, add <json>, update <id> <field> <value>, rename <oldId> <newId>, stats [roadmap], completed [roadmap] |
| `quox doctor <name>` | Check a plugin against the dev-bundle DoD: 13-point chain + the five prohibitions. Machine evidence only; exit 0 green, 1 findings, 2 cannot evaluate.: (no subcommands) |
| `quox plugin` | Manage org-installed plugins: list, get, install, update, uninstall, mine, data list, data get, data set, data delete, secrets list, secrets set, secrets reveal, secrets delete, assign list, assign add, assign remove, trusted-keys list, trusted-keys add, trusted-keys remove |
| `quox powers` | Deploy and manage POWERS (MCP endpoint / hosted-repo tools): detect, deploy, deploy-repo, status, finalize, update, archive, restore, config, delete |
| `quox prompt` | Manage the user-owned prompts library: list, get, create, update, delete, versions, restore, export, import |
| `quox qlarity` | Qlarity: open a page, ask it a question, keep the receipt: health, allowlist, origins add <origin>, origins remove <origin>, inspectors, sessions, close <sessionId>, read <url>, console <url>, network <url>, screenshot <url>, eval <url> <script> |
| `quox quoxbox` | QuoxBox governed Mac-mini agent — status, workflows, tasks, HITL approvals: status, workflows, run, task, tasks, approve, deny, mode |
| `quox quoxchat` | Manage QuoxChat website widgets: widgets, availability, conversations, transcript, reply |
| `quox seo` | QuoxSEO: the URL warehouse with a witnessed history: status, urls, url <path>, crawls, changes, trends, coverage, verify, health |
| `quox role` | Manage org custom roles (enterprise — RBAC): list, get, create, delete, capability add, capability remove, agent list, agent set, agent clear, tool list, tool set, tool clear |
| `quox run` | Manage workflow runs: list, get, create, cancel, resume |
| `quox safety` | Kill switch (per-agent E-STOP) and instance DEFCON (human-admin gated mutations): status, gate, estop, release, defcon, history |
| `quox scim` | Manage org SCIM bearer tokens (enterprise — IdP directory sync): tokens list, tokens create, tokens delete |
| `quox scope` | View scopes (read-only — use `quox org`/`quox division`/`quox team` to manage): list |
| `quox security` | Manage org security policy (enterprise — session, IP allowlist, MFA): session-policy get, session-policy set, ip-allowlist list, ip-allowlist add, ip-allowlist remove, mfa get, mfa set |
| `quox service` | Check service health and status: health |
| `quox health` | Check health of all QuoxCORE services (alias for `service health`): (no subcommands) |
| `quox setup` | First-time setup and configuration: status, admin, config, license activate, license link, license status, license deactivate |
| `quox skills` | Manage the quoxflow skill library (QSKL Crystals): query, run, review, promote, and your saved library: list, show, run, review list, review show, review approve, review reject, library list, library add, library remove, from-execution, promote-draft, rollback-to-version, protect, disclosures, protections, sealed list, sealed show, sealed add, sealed invoke |
| `quox slot` | Manage DEVSUITE-SLOTS: checkout/release the fixed session addresses, say/read into a slot room: list, create, retire, checkout, release, heartbeat, assign, claim, say, read, peek, wait, bridge list, bridge set, bridge clear |
| `quox sso` | Manage org SSO providers (enterprise — OIDC/SAML admin): providers list, providers get, providers create, providers update, providers delete, providers saml-metadata |
| `quox status` | Show platform health and status overview: (no subcommands) |
| `quox tag` | Manage tags: list, create, update, delete |
| `quox team` | Manage teams: list, get, create, update, delete, provision-room, members add, members remove |
| `quox tg` | Manage Telegram Pro: onboarding status, owner binding, session leases, webhook admin: status, bind-owner, leases, webhook-info, setup |
| `quox tiktok` | TikTok video publishing and draft uploads: governed, HITL-approved via Inbox-Q, on your own dedicated TikTok credential: publish, draft, profile, videos, stats, status |
| `quox tool` | Manage tools and tool catalog: list, get, create, update, delete, publish, catalog, exec, install |
| `quox trace` | Trace Replay & Visualization: assembled traces, simulation, comparison, replay sessions: list, get, simulate, compare, replay list, replay get, replay create, replay update, replay delete, replay delete-all, comparison list, comparison get, comparison create, comparison update, comparison delete, comparison delete-all, correlation list, correlation get, correlation create, correlation delete |
| `quox trigger` | View quoxflow trigger subscriptions (webhooks, schedules, events) and activate/deactivate workflows: webhooks, schedules, events, workflow-activate, workflow-deactivate |
| `quox vault` | Manage QuoxVault credentials: list, get, create, update, repos, delete, set-default, test, test-new, test-all, stats, scan, activity, types, rotate, expiring, folder list, folder create, folder rename, folder delete, assign, unassign, assignments, lease request, lease list, lease approve, lease deny, lease revoke, cross-org, health, migrate |
| `quox volt` | VOLT evidence bundle verification and inspection: verify, inspect, export, fetch, summary, accept, acceptance |
| `quox watch` | Real-time monitoring dashboards: fleet, services |
| `quox webhook` | Manage org webhook subscribers (enterprise — team_event fan-out): list, create, rotate, delete |
| `quox workflow` | Manage workflows: list, get, create, update, delete, run, publish, steps list, steps set, apply, validate, import-n8n, import-objective |
| `quox x` | X (Twitter) posting: governed, HITL-approved via Inbox-Q: post, thread, delete, like, repost, read, timeline, search, mentions, status, media-root |
| `quox tui` | Launch interactive TUI: (no subcommands) |
| `quox completion <shell>` | Generate shell completions (bash, zsh, fish): (no subcommands) |
<!-- quoxpert:generated:end command-map -->

## Recipes (hand-authored, the actual expertise)

### 1. First login + first org (from a fresh account)
    quox signup --email demo@example.com --password 'DemoPass123!@#' --name "Demo User"
    quox login --email demo@example.com --password 'DemoPass123!@#'
    quox org create --name "My Org"
    quox org switch <org-slug>
    quox login --email demo@example.com --password 'DemoPass123!@#'   # re-login: picks up org-scoped JWT
    quox whoami
Real transcript (verified live):
```
Account created for demo@example.com. Check your email for verification.
- Authenticating...
Logged in as demo@example.com
Created organization: Quoxpert Demo Org (quoxpert-demo-org)
- Authenticating...
Logged in as demo@example.com | Org: Quoxpert Demo Org (quoxpert-demo-org)
```
Gotcha: `org switch` alone returned `403 not_org_member` on the token issued *before* org
creation: re-running `quox login` after `org create` is what actually rescopes the session.
Gotcha (#1034, fixed 2026-10-16): `quox org switch` changes the SHARED profile's default org, so every
other window, script and proof run on that profile follows it (it now warns with their pids). To move ONE
TUI window, use `/org switch` inside it: window-scoped, held in memory, never written to config.json, and
carried across `/restart`. Scripts and proof runs should still pin `--org` rather than trust the profile.

### 2. `status` vs `doctor`: health checks
    quox doctor
Real output:
```
 ✓ Auth service         3101 (163ms)
 ⚠ Memory service       3103 (66ms) HTTP 401
 ✓ Collector            9848 (68ms)
 ✓ QuoxFlow             3200 (80ms)
 ✓ Files service        3102 (77ms)
 ✓ QuoxAgent daemon     9847 (48ms)
 ✓ Qdrant vectors       6333 (64ms)
 ✓ Auth token           valid (expires in 1h)

 7 passed  1 warning
```
`doctor` checks each service independently and is the reliable one; `quox status` aggregates
through the collector and can 401 even with a valid session (see Gotchas).

### 3. Chat with CommanderQ (streaming by default)
    quox chat "Say hello in exactly 5 words" --no-stream
Real output:
```
- Thinking...
Hello there, good day!
```
Drop `--no-stream` for token-by-token streaming (the default; better for interactive use). Route
to a specialist with `--agent sentinel` (etc.); continue a session with `--conversation <id>`.

### 4-quick. Approve or reject an inbox item or tool approval (the flag people miss)
    quox inbox respond <itemId> --action approve|reject|defer|resolve [--comment "<why>"]
`--action` is the flag that picks approve vs reject (`itemId` may also be a tool `approvalId` from an agent). Find the id with `quox inbox list --status pending`.

### 4. List and approve a pending HITL inbox item
    quox inbox list --status pending
    quox inbox get <itemId>     # alias: quox inbox show; prints the approval context block first (once 91d339805 is deployed)
    quox inbox respond <itemId> --action approve --comment "verified with owner"
Real output on a fresh org (no pending items yet):
```
No results.
```
`inbox stats` gives the counters even with an empty inbox:
```
Inbox Stats
─────────────────────
  open           0
  in_progress    0
  waiting        0
  resolved       0
  urgent         0
  overdue        0
  total_active   0
  unread         0
  flagged        0
  snoozed        0
```
`--action` accepts `approve | reject | defer | resolve`.

### 4b. Connect an InboxQ mailbox and triage it (`quox mail`)
`quox mail` is InboxQ (email triage), NOT `quox inbox` (the HITL approvals queue).

    # connect a mailbox inline (creates the vault credential + the account in one go)
    MAIL_PASS="…" quox -p moo mail connect --email <mailbox> \
        --imap-host <imap-host> --password-env MAIL_PASS
    quox -p moo mail accounts
    quox -p moo mail sync <accountId>          # first pull can take >30s (240s client timeout)
    quox -p moo mail zones                      # focus / fyi / auto / screened counts
    quox -p moo mail list --zone focus
    quox -p moo mail report <accountId> --generate
    # batch onboarding
    quox -p moo mail import mailboxes.csv       # header: email,imap_host[,imap_port,password_env|password,folders,…]

GOTCHAS (each cost real time on 2026-09-25):
- **Creating a credential needs a SECRETS_WRITE profile.** The resident agent gets
  `403 forbidden`; run as a human/admin profile with `-p <name>` (e.g. `-p moo`). The
  `-p` flag must be on the create/connect command itself, not just a prior `quox -p moo login`.
- **Switch org FIRST or the mailbox lands in the wrong tenant.** `connect` uses the
  session's active org for BOTH the credential and the account. `quox org switch <orgId>`
  before connecting; `--org` alone only rewrites vault paths, not the server-resolved
  account org, so they can diverge. Recover: `mail disconnect <id>` + `vault delete <credId>`.
- **A first full sync is slow, not failed.** It runs the whole IMAP pull + classify in one
  request; the CLI shows real triage counts via `mail zones` even if the sync call looked
  slow. It completes server-side.
- **Background auto-sync is opt-in + operator-gated.** Per-org via `PUT /settings`
  (dashboard Settings), and the instance master flag `INBOXQ_SYNC_ENABLED=1` must be set;
  otherwise `mail sync` (manual) is the only path.
- **Global CLI staleness:** if `quox mail` returns `unknown command 'mail'`, the stable CLI
  worktree (`~/quox-dashboard-cli`) is behind main — refresh it (`git fetch origin main &&
  git checkout origin/main`), but never clobber another session's WIP in it (quox#607).

### 5. Create an agent and inspect it as JSON
    quox agent create --name "Demo Agent" --agent-id demo_agent --level 2 \
      --domain demo --description "Example agent"
    quox agent list --json
Real output (verified live):
```
Agent "Quoxpert Demo Agent" created.
```
```json
[
  {
    "id": "01JT7Q6SGH1YBM8VSXRAR4FHSG",
    "agent_id": "quoxpert_demo",
    "name": "Quoxpert Demo Agent",
    "level": 2,
    "status": "active",
    "domains": [],
    "capabilities": []
  }
]
```

### 6. Query the QSKL skill/crystal library and run one
    quox skills list
    quox skills run <sourceWorkflowId> --data '{"key":"value"}'
Real output (truncated, live library; these are Quox's own agent-facing Crystals, not
Quoxpert):
```
 ID                            Name                              Category               Edition
 01KRH1RY0FQQAFK30XGNGV3A1T    voice-transcribe-audio            voice/operations       stable
 01KRH1RXZZCR3JPAJ6MBPH3690    voice-segment-on-silence          voice/operations       stable
 01KRH1RXWVT2ENYWC5W0KHYAZD    vault-secret-rotate               security               stable
 01KRH1RXTXHYCKS6T5HB5XNW7W    prom-range-query                  ops/health             stable
```
`skills run <id>` takes the skill's `sourceWorkflowId`, not the display ID column: read it from
`skills show <id>` first. Add `--async` to fire-and-forget and poll via `quox run get <id>`.

### 7. Save and search memory
    quox memory create --type fact --content "nginx runs on docker01" --tags infra,nginx
    quox memory list
    quox memory search --help    # see flags for query/type/tag filters
    quox memory core             # the core set every chat turn carries (pinned + auto-promoted), with the reason
    quox memory pin <id>         # pin into the core set; `unpin` removes it and stops auto-promotion
Real output (verified live):
```
Memory saved.
```
```
 ID                            Type    Content                                 Tags              Created
 01KX7T2V8BF3G3FDXMER698N54    -       Quoxpert CLI recipe verification run    quoxpert, demo    2026-07-11 05:23:27
```

### 8. Browse the tool catalog and check the credential vault
    quox tool catalog
    quox vault types
    quox vault list
Real output (`vault types`, truncated):
```
 ID            Name             Description
 openai        OpenAI           GPT models, embeddings, and DALL-E
 anthropic     Anthropic        Claude models and API
 elevenlabs    ElevenLabs       Text-to-speech and voice cloning
```
`vault list` on a fresh org returns `No credentials found.` Create one with
`vault create` (interactive) before wiring an integration.

### 9. Deploy a live MCP endpoint as a governed POWERS agent
    quox powers detect --url https://example.com/mcp
    quox powers deploy --url https://example.com/mcp --agent-id my_mcp_agent \
      --name "My MCP Agent" --auth-kind bearer --auth-value "$MCP_TOKEN"
`detect` probes the endpoint and lists its tools before you commit to deploying; `deploy` is
one-shot (no container build) for a live MCP server you already trust. Full recipes, the
`deploy-repo`/`status`/`finalize`/`update`/`archive` lifecycle, and when to pick POWERS over
the plugin SDK live in `quoxpert-mcp` (the owning skill); this is the terminal-scripting quick
reference only.

### 10. Export → edit → re-apply a workflow declaratively
    quox workflow get <id> -o json > wf.json     # or: quox workflow export, if your version has it
    # edit wf.json, top-level {name, definition:{name, nodes:[...], edges:[...]}}
    quox workflow apply -f wf.json               # POST if no id, PUT+diff-preview if it has one
    quox workflow validate <id>                   # validates the STORED workflow, not the local file
Gotcha (found live): `apply` 400s on a syntactically-valid-looking JSON if `definition.nodes[].type`
isn't a node type quoxflow recognizes (e.g. a bare `util:log` was rejected on this dev instance):
check `--debug` to see the exact POST body/response, and prefer round-tripping an existing
workflow's `get` output as your edit base rather than hand-writing a definition from scratch.

### 11. Track a fleet across hosts
    quox fleet status
    quox fleet summary
    quox watch fleet --interval 5
`fleet status`/`summary` are one-shot reads; `watch fleet` is a live-refreshing TUI dashboard.
Don't script against its output, use `fleet status --json` (or `mon`) for automation instead.

### 11a. Fleet monitoring (`quox mon`, distinct from `quox monitoring`)
    quox mon docker fleet
    quox mon docker containers --host <hostId>
    quox mon wazuh agents
    quox mon agh-chain leaderboard
`quox mon` is the Docker/Wazuh/AGH-chain/Prometheus surface (host-level infra
monitoring); `quox monitoring` is the separate platform-health/governance-incident
surface (`quox monitoring health`, `quox monitoring incidents list`) — same
prefix, different backends, do not conflate them. `quox mon docker action <id>
<action>` (start/stop/restart) is destructive; `quox mon config get` shows which
Prometheus/Uptime Kuma/Grafana URLs are wired before trusting a metric.

**Wazuh indexer reads (alerts, vulnerabilities) need a one-time on-host credential file**
(FND_01M50XEEKX9ZGBEB2YAT9ZGBEB, 2026-10-16). The collector reads the indexer over governed
Bastion exec on the wazuh fleet host, with `sudo -n curl --config /etc/quox/wazuh-indexer.curlrc`.
The password is never in a command, log or the Bastion audit trail. On a new install (or when a
read returns `wazuh_indexer_credential_missing`), the OWNER runs, once, from their own terminal:
`bash ~/.quox/wazuh/install-wazuh-indexer-curlrc.sh control@<wazuh host>`. It prompts for the
user and a hidden password, writes the file root:root 0600 over their own ssh+sudo, and prints only
the HTTP status of one read-only check. An agent must never place that file or type the password
(it would pass the secret through a command). Other errors: `wazuh_host_not_in_fleet` (WAZUH_HOST
is not a registered fleet host) and `wazuh_sudo_refused` (the Bastion exec user lacks `sudo -n` on
that host). Caveat: raw Bastion exec is the Risky tier, so on a Bastion that enforces approval
grants each read needs one; a Safe-tier Bastion tool for indexer reads is the follow-up.

### 11b. Uptime Kuma with VIGIL (`quox kuma`)

```
quox kuma status [slug] [--all]              # every monitor grouped: state, ping, 24h/30d uptime (bare `quox kuma` = status)
quox kuma down [slug] [--all]                # only monitors not up; exit 0 all up, 3 any down, 1 error
quox kuma uptime [slug] [--all] [--below <pct>]   # per-monitor uptime, worst first
quox kuma refresh                            # bust the live-state cache, re-scrape public status pages
quox kuma monitors list                      # id, active, type, name, target, interval
quox kuma monitors get <id>                  # one monitor in full
quox kuma monitors add --name <name> --type http|keyword|port|ping|dns [--url <url>] [--hostname <host>] [--port <n>] [--interval <seconds>] [--keyword <text>]
quox kuma monitors edit <id> [--name ...] [--type ...] [--url ...] [--hostname ...] [--port ...] [--interval ...] [--keyword ...]   # only the flags you give change
quox kuma monitors pause <id>
quox kuma monitors resume <id>
quox kuma monitors remove <id>
quox kuma incidents [--open] [--limit <n>]   # Kuma alerts that became witnessed incidents
quox kuma diagnose <incidentId>              # outside-in DNS/TCP/HTTP/TLS/keyword checks plus read-only host checks
quox kuma diagnose --monitor <id>            # newest open incident of that monitor
quox kuma coverage [--all]                   # what is monitored vs what is not
quox kuma coverage show
quox kuma coverage propose <name...>
quox kuma maintenance list
quox kuma maintenance open --title "<text>" --for <minutes> --monitors all|<id,id>|tag:<name> [--start <iso>]
quox kuma maintenance end <id>
quox kuma status-incident draft|publish|resolve
quox kuma hooks list|create|delete           # create prints the secret ONCE: write it to a 0600 file
```

Signed uptime (SLA) reports:

```
quox kuma sla --month <YYYY-MM> [--out <file>]       # calendar month in UTC, signed bundle
quox kuma sla --from <iso> --to <iso> [--out <file>] # explicit range, end exclusive
quox kuma sla list                                   # this org's stored SLA reports
quox kuma sla verify <report-id>                     # recompute hash, check signature via the collector
quox kuma sla verify <bundle-file> [--public-key <base64>]   # fully offline; pin a raw 32 byte Ed25519 key
```

- `sla verify` exits 2 when the report does NOT verify.
- Writes (`monitors add|edit|pause|resume|remove`, `maintenance open|end`, `status-incident`) are org-admin only and held for human approval: a human session gets HTTP 202 awaiting approval; an attached agent prints `awaiting approval <id>`. Never claim applied until the approval result says executed.
- Identical pending writes join one approval.
- Setup: an `uptime_kuma` vault credential (base_url, username, password, optional totp_secret) in the org. A private-network Kuma needs `quox server config lan-targets on` (instance admin). Agents cannot create vault secrets: a human pipes the JSON into `quox vault create --type uptime_kuma --credentials-stdin`.
- `status` reads the vault Kuma, not the old `/api/v1/monitoring/uptime-kuma/status/:slug` public-status-page path (legacy, can be stale).
- A delete answered with HTTP 403 and `pending:true` plus an approvalId is an approval, not a dead token.
- A fresh attach token may 403 until the first `quox agent attach-heartbeat`.
- In chat, ask VIGIL: `quox chat --agent beacon "what's down?"`. It reads, diagnoses, verifies SLA reports and files writes for approval.

### 11c. Attach this session to an agent
```
quox agent attach <agentId> [--ttl <sec>] [--force] [--label <session_label>] [--no-slot] [--no-keep] [--no-prime] [--no-adopt]
quox agent attach-status <agentId>                     # current lease
quox agent exec <agentId> --tool <name> --input '<json>'   # run one tool AS the attached agent (witnessed)
quox agent detach <agentId> [--handoff-text "<note>" | --handoff <file>] [--force-detach] [--no-brain-note]
quox agent detach <agentId> --lease <leaseId>          # release a lease when the local attach kit is gone
quox agent grant-attach <agentId> <userId>             # org admin: allow a user to attach
quox agent list-grants <agentId>
quox agent bind-slot <agentId> <slotName>              # org admin: bind the agent to a durable slot address
```

- `<agentId>` is REQUIRED: the registry id, e.g. `seer`. Bare `quox agent attach` fails.
- Attach leases the agent, fetches its attach kit and installs it locally; the default prints an adoption block so the session takes the identity.
- `--ttl` default 900 seconds; a background keeper heartbeats the lease every 5 minutes until the session exits (`--no-keep` disables it).
- `--force` takes over a lease held elsewhere.
- Plain `quox` verbs then run AS the agent when `QUOX_AS=<agentId>` is exported (or `--as <agentId>`).

### 11d. Connect an AI provider
```
quox provider list                                     # which providers this org can use and how each is connected
quox provider connect <kind> --key-from-stdin          # keyed provider: openai, anthropic, openrouter, huggingface, groq, together
quox provider connect <kind> <url> [--model <model>] [--yes]   # self-hosted: ollama, lmstudio, vllm, custom
quox provider test [kind]                              # test the stored connection (default: every connected provider)
quox provider install claude-code|codex [--yes]        # instance admin: install the vendor CLI on the server
```

- Pipe the key on stdin (`--key-from-stdin`) or answer the hidden prompt in a terminal; NEVER pass a key as an argument and never paste one into chat.
- Quox runs in containers: for a self-hosted provider `127.0.0.1` / `localhost` means the Quox container, not your machine. Use the host's LAN IP, e.g. `http://192.0.2.10:11434`.
- `--yes` confirms connecting to an address on a private network (the server still checks and audits it).
- Provider keys are stored in the vault; `provider connect` is the verb for it, not a hand-made vault credential.

### 12. Inspect governance evidence and traces
    quox governance evidence
    quox trace list
Real output (truncated, live):
```
 ID                            Type             Correlation                     Workflow
 01KX7T7J1HH2CHW6GSRZZ8AZC5    data_snapshot    wf-forge-heartbeat-JVSX285K     forge-heartbeat
```
```
 Run ID                           Actor         Outcome     Layers    Decisions    Denied    HITL
 SESSION_ENV_MRFX5N2D_3Y7MWREC    anonymous     complete    11        0            no        no
```
Use `quox trace get <runId>` for the full narrative + per-layer waterfall on any run above.

### 12a. Compile and arm a governance rule (OPGOV policy compiler)
    quox policy compile "deny any agent from deleting a vault credential without a human approval"
    quox policy list
    quox policy arm <id>
`compile` runs a plain-language rule through a deterministic grammar into a
reviewed `quox-policy.v1` draft; an out-of-grammar rule is refused outright,
never silently approximated into something close. `arm` requires a logged-in
human — a service key is refused by design, mirroring `quox safety`'s
admin-only mutation boundary (Recipe 14).

### 12b. Blast radius: what an agent can reach, before it acts (added 2026-09-21, BLAST-RADIUS stream)
    quox reach agent <agentId>            # static radius: bands + R0-R5 badge
    quox reach unused <agentId> --days 30 # predicted-vs-actual least-privilege report
Real output (live, 2026-09-20):
```
💥 REACH │ agent seer │ R2 · 18 tools 0 creds 0 hosts 3 origins · 41ms
```
Bands are REQUESTS / MAY / CANNOT / UNKNOWN; CANNOT derives from deny-by-default
registries, UNKNOWN is honest absence (never rendered as zero). `unused` leads
with per-layer COVERAGE (hosts/egress/delegates are not-observed today and say
so; recommendations pair with the exact edit, e.g. the `quox vault unassign`
chain). `quox vault assign/unassign` prints a grant delta line (badge moves
live with the grant). Governance policies can gate ON radius via `reach.*`
condition fields (reach.tools, reach.credentials, reach.hosts, reach.level...);
fail-closed: unavailable reach MATCHES reach-referencing deny/approval
policies. Every evaluation is a witnessed `quox.reach.evaluate` envelope
(`quox aee query --intent quox.reach.evaluate` = the usage ledger). Honest
limits live in quox-dashboard/docs/STATUS_AND_LIMITS_BLAST-RADIUS.md.
`quox tool exec <name> --args '{...}'` (POST /api/v1/tools/execute) is now
live and is the way to trip a gate deterministically (quox#563 closed).

### 12c. Org-wide agent inventory (the CMDB sibling of `quox reach`)
    quox inventory
    quox inventory --days 7
    quox inventory --unused          # SLOW at org scale: minutes, not seconds
    quox inventory --drift           # diff against the last stored snapshot, store this as new baseline
Where `quox reach` answers "what can THIS agent reach", `quox inventory` rolls
that up org-wide: agents, models, tool/credential grants, delegation edges,
and unused-grant drift in one pass. For a single agent prefer `quox reach
unused <agentId>` (Recipe 12b); `--unused` here is the expensive org-wide
version. `--drift` witnesses the rollup as `quox.reach.inventory_drift`.

### 12d. QuoxHats: inspect, reset a built-in, and make your own custom hats (quox#721, CUSTOM-HATS)
    quox hat list                       # key, rev, template status, authz mode, privileged, tool counts + org enforcement/selection
    quox hat show default               # id OR key: explicit tools, bundles, connector families, authz allow/deny, revision history
    quox hat show default --rev 5       # a historical revision (GET .../quoxhat/hats/:id?revision=5)
    quox hat reset default --yes        # org-edited built-in -> current template (drops org edits; audited; needs manage-settings)
    quox hat upgrade default --dry-run  # 3-way merge preview: template vM -> vN, org changes kept, conflicts, held widening (writes nothing)
    quox hat upgrade default --yes      # apply that merge: one system-authored revision, history kept, audited quoxhat.hat.template_merged
Reads the auth service's `/api/orgs/:orgId/quoxhat/*` routes (the collector only has the
/internal service-key hat routes). Built-in hats are not edited from the CLI (and the dashboard has no
hat editor either): `Template: vN (template vM available)` means an org-edited built-in is frozen out of
automatic template upgrades (any org-authored revision in history freezes it, even after a reset).
PREFER `quox hat upgrade <hat> --dry-run` then `--yes` (f91035ed6, 2026-10-19): it keeps the org's edits;
`quox hat reset <hat> --yes` (8049f88e1) discards them. Listing hats never applies a merge.
Without `--yes` it refuses and sends nothing. Run it as a human admin profile (`-p moo`). A template-authored built-in upgrades
itself on the next turn and logs `quoxhat.hat.template_upgraded` in the auth audit log.

**Custom hats (CUSTOM-HATS, landed daa623d8e 2026-10-17, driven live on dev):** group your own agents under
your own hats so a turn carries only those agents.

    quox -p moo hat create security --name "Security" --agents sentinel,cipher   # [--from <hat>] [--tools a,b] [--mode permissive|restrictive] [--offer members|authorized] [--private]
    quox -p moo hat edit security --add-agents argus --remove-agents cipher --name "Security Ops"   # also --agents/--tools (replace), --add-tools/--remove-tools, --mode, --offer
    quox -p moo hat use security --conversation <QXC_id>    # same audited switch as /hat security in the window
    quox -p moo hat delete security --yes                   # custom only; built-ins are refused (reset them)

- create/edit/delete are CUSTOM hats only and need the existing hat-edit permission (org manage-settings), or
  ownership for `--private`. Every write appends a revision and audits `quoxhat.hat.created|updated|deleted`.
- create adds `delegate_to_agent` + `agent_directory` when the hat lists agents, and sets `tools.offer: members`
  (an orchestrator turn is offered only the hat's members). Authority is unchanged: permissive keeps every agent's
  own grant. `--mode restrictive` authorizes only the listed tools for EVERY agent under the hat, its own agents
  included when delegated to, so it can strip them: use it on purpose only.
- Under an ENFORCED org, a hat with agents narrows each turn: the prompt roster and `agent_directory` name only the
  hat's agents and delegation to others is refused. Proof line: `docker logs quox-collector | grep "context scope turn"`
  (`agents_in_scope=sentinel,cipher offer=members pool=11` vs `agents_in_scope=all pool=300` on Default), and the
  witnessed `quoxhat.manifest.resolved` envelope carries `agents_in_scope`. In preview orgs nothing narrows.
- Gotcha: the org default hat cannot be deleted (409 hat_is_org_default); move the default first. A key taken by a
  built-in (e.g. `marketing`) cannot be reused: pick another key.
- Gotcha: after a mid-conversation hat switch the resumed CLI session is not told the hat changed, so the model may
  "correct" its previous (right) answer (gripe filed 2026-10-17).
- In the window: `/hat new` walks name, starting hat, agents (y/N/c cards); `/hat edit <hat>`, `/hat delete <hat>`.
Needs a CLI that includes commit cd3284287 (refresh `~/quox-dashboard-cli` after merge).

### 13. Run an interactive session on a dev host (`quox dev sessions`)
    quox dev enable <host>
    quox dev sessions list <host>
    quox dev sessions new <host> --name build --backend claude
    quox dev sessions send <host> <sessionId> "npm test"
    quox dev sessions pane <host> <sessionId>
    quox dev sessions kill <host> <sessionId>
Live since 2026-08-20. These are tmux sessions on the dev host, so they survive
both detach AND a quoxagent restart, which is what makes them usable for long
builds. `--backend` takes `shell`, `claude` or `codex`. Use `--by-name` on
send/pane/kill to reach an orphaned session whose id you no longer have.
`quox dev enable` does more than flip a flag: it delivers the capability
profile, the current agent binary and the CLI bundle, then restarts the agent
to adopt them. `quox dev doctor` is the first thing to run when a dev host
looks wired but behaves like it isn't.

(This recipe is hand-authored on purpose. The command-map row above is
generated from the CLI's own `.description()` strings, which carry the
subcommand names but not the operating detail. An earlier attempt to keep
this knowledge in the table itself was silently overwritten by the next
regen, per fleet #433.)

### 13. Attest a run's outcome (acceptance verdict, shipped 2026-09-03)

The evidence chain proves what happened; the acceptance verdict records
whether it WORKED, separately from run status (a denied run can honestly be
a pass when proving the deny was the intent). Attestation, not automated
evaluation; the server derives WHO attested from the credential class
(human/agent/service), never self-asserted, and witnesses the verdict as
its own VOLT run pinning the target's head_hash.

    quox volt accept VR_... --verdict pass --reason "output matched the brief"
    quox volt acceptance VR_...        # latest + append-only history

Gotcha: the target must be TERMINAL (completed/failed); an active run has
no outcome to attest and is refused. A later verdict supersedes but never
edits history. REST equivalent: POST/GET /volt/runs/:runId/acceptance.

### 14. Halt and release an agent (kill switch, shipped 2026-09-03)

    quox safety status                 # DEFCON + active E-STOPs for the org
    quox safety gate <agentId>         # the verdict a dispatcher gets right now
    quox safety estop <agentId> --reason "why"
    quox safety release <agentId>
    quox safety defcon RED --reason "full halt"
    quox safety history --agent <agentId>

Gotchas that are DESIGN, not bugs: mutations require a HUMAN admin login;
a resident/agent/service token gets 403 admin_required, which is the
governance boundary working (an agent must never flip its own kill
switch), so log in as a human rather than looking for a bypass. An E-STOP
holds work, it does not destroy it: a human-approved plan dispatched for a
halted agent is refused HTTP 423 AGENT_HALTED and stays re-approvable
after release.

### 15. QuoxBox: governed Mac-mini agent (status, workflows, HITL approve/deny)
    quox quoxbox status
    quox quoxbox workflows
    quox quoxbox run <workflow>
    quox quoxbox tasks
    quox quoxbox task <taskId>
    quox quoxbox approve <approvalId>
    quox quoxbox deny <approvalId>
    quox quoxbox mode <readonly|propose|actuate>
`status` is the fast orientation read: mode, halt state, breaker, pending
approvals, recent tasks. `run` starts a governed workflow task; anything that
mutates the Mac-mini routes through the HITL inbox first (same `approve`/`deny`
pattern as `quox inbox respond`, Recipe 4) rather than executing blind.
`mode` is the gateway-wide gate: `readonly` observes only, `propose` drafts
actions for approval, `actuate` is the only mode that lets an approved action
actually run — check `status` after a `mode` change, don't assume it took.

### 16. Governed sessions: quox claude / codex / gemini / wrap (driven live 2026-10-05)
    quox claude -n VULCAN                          # same args as claude; runs in tmux session quox-VULCAN
    quox claude --resume VULCAN                    # reattach if alive (no context reload), else claude --resume
    quox claude -n VULCAN --as vulcan --slot vulcan   # start ATTACHED to agent vulcan + HOLDING slot vulcan
    quox claude --model haiku -p "prompt"          # -p is claude's --print here, never quox --profile
    quox sessions ls | attach <name> | kill <name> # manage; inside tmux: Ctrl-b d leave, Ctrl-b h help
    quox codex resume NAME | quox wrap <program> ... | quox tui --governed
Arguments after the command go to the wrapped program verbatim; quox consumes only
`--no-tmux`, `--as`, `--slot`. `--as` (not `--agent`) because claude has its own
`--agent`, which passes through. `--as/--slot` set QUOX_PREATTACH_* on the NEW tmux
session; the dev-pack SessionStart hook (quox-devsuite session_tips.py) attaches and
checks out INSIDE the Claude process tree (attach is keyed by the claude pid, so it
cannot happen before claude starts), tells the model to arm `quox slot wait`, and the
in-Claude slot/attach offers stay silent. Gotchas: the first interactive run in a
folder still shows Claude's folder-trust dialog (not automated, by design); a wait
double-forked with `( cmd & )` loses its claude ancestor and resolves the wrong
session (use run_in_background or a plain `&`).

### 17. Brain2: recall, prove grounding, keep the corpus clean (driven live 2026-10-05, BRAIN2-AUDIT)
- **Recall before re-deriving:** `quox brain search "<q>" --brief` prints the 🌌 header plus one
  line per hit naming WHAT it found and FROM WHERE (`saved memory`, `past session`, `QuoxPlan`,
  `git history`), with a note id prefix to cite. The table form (no flag) is for humans browsing.
- **The scoreboard is `quox brain usage`** (Grounding block): answers citing a retrieved note,
  notes cited/retrieved, `last_grounded`. That number, not vibes, says whether Brain2 is used.
  Agent answers cite `[K1]` (auto-injected context) / `[B1]` (quoxbrain_search tool) handles;
  grouped forms like `[B2, B3]` count.
- **Health of the corpus:** `quox brain status` shows counts per vault. A huge vault is not a
  good vault: on 2026-10-05, 84% of 424k vectors were junk (empty conversation placeholders,
  `enc:v1:` ciphertext policy rows, duplicate tool pings, fleet heartbeat errors). Sample a feed
  before trusting it.
- **Feed sources have no CLI verb yet (quox#683).** List/toggle via the collector:
  `GET/PUT /api/feed/sources[/:sourceType]?org_id=<org>` with `{"enabled":false}` (service key,
  run from inside quox-collector; never print the key).
- **Resync the file corpora** (Agent Memory / Docs / Git have no scheduler until the
  `deploy/quoxbrain-readers/` timer is installed): from `services/quoxbrain`,
  `INTERNAL_SERVICE_KEY="$(docker exec quox-collector printenv INTERNAL_SERVICE_KEY)" QUOXBRAIN_URL=http://127.0.0.1:3106 node readers/run.mjs --reader automemory --org <org> [--dry-run]`
  (also `docs`, `git`). Idempotent. Gotcha: the git reader re-added 1000 commits as new notes (quox#686).
- **Never rebuild quoxbrain during a long delete/purge:** the recreate kills the transaction
  (it rolls back cleanly, but the work is lost). Post on the brain owner's slot first.
- **Cold start:** the dense cache warms ~80s after every quoxbrain restart (yielding, healthy);
  the first search of a NEW query can serve `retrieval: fts` while its embedding lands.

### LUCID situational awareness (`quox lucid`, alias `quox aware`; core, free)
- **Orient first:** `quox lucid` prints the situation in four fixed sections (NEEDS YOU ranked
  with wait + gates / CHANGED SINCE YOU LAST LOOKED / IN MOTION / WHAT I CANNOT SEE) and ADVANCES
  your cursor. Use `--no-advance` to peek without consuming, `quox lucid since 3h` (or a seq) for
  a window that never advances, `--json` for the structured object.
- **Drill down:** `quox lucid subjects [--ledger social|vital|operational|intentional|security]`,
  `quox lucid feeds` (who is speaking, silent, failing, never heard), `quox lucid journal --after <seq>`.
- **Feeding it:** host gatherers POST `/api/internal/lucid/events` (service key) with
  `{org_id, events, snapshots, expected_feeds}`; a user-auth POST to `/api/v1/lucid/events` is
  forced to feed `user:<id>` (cannot impersonate a system feed). On this box the gatherer is the
  `quox-lucid-gather` user timer (source `quox-dashboard/scripts/lucid/`, installed copy under
  `~/.local/share/quox/lucid/`; reinstall with `scripts/lucid/install.sh`, never exec the tree).
- **Gotchas:** put volatile numbers in `state`, never in `summary` (a changed summary is a journal
  row: elapsed timers turn the journal into noise). Pass `state.since` (when the SOURCE says the
  status began) so waits are real, and keep `ts` = observation time or the subject goes stale at
  once. Only send a snapshot when the read succeeded: an empty snapshot retracts everything.
  `/api/v1/awareness/summary` (v0) is a compat alias whose `text` is now the LUCID situation.
- **Long-running Ink TUIs (deck, dashboards): two traps that OOM'd `quox lucid deck` after 8.5h (2026-10-11).**
  (1) Never put a prop with a default function value (`now = () => Date.now()`) or an unmemoised object in a
  `useCallback`/`useEffect` dependency list: it is new every render, so a "refresh on interval" effect restarts and
  fetches on EVERY redraw (the deck hammered the collector continuously). Hold props in refs; give the effect `[]`.
  Test it: mount with a 1h interval, wait through several ticks, assert ONE fetch. (2) Run React's production build
  for anything long-lived (`process.env.NODE_ENV ||= 'production'` before importing react): the dev build's heap
  creeps per render (measured: dev grows steadily, production flat at 14MB).

## Output contracts & scripting

- `-o/--output <table|json|csv|quiet>` on read commands; `--json` is shorthand for `-o json`;
  `-q/--quiet` prints IDs only (one per line, pipe-friendly).
- `--org <slug>` overrides the active org for a single invocation without switching context.
- `--debug` prints the exact HTTP method/URL/body and the raw response: the fastest way to
  diagnose a 400/401/403 without guessing.
- `--dry-run` shows what a mutating command would do without executing it; `-y/--yes` skips
  confirmation prompts (needed for CI).
- Exit codes: 0 on success, non-zero on any error (including `pending_approval` outcomes: check
  the message, not just the exit code, to distinguish "needs a human" from "actually failed").
- **Error contract (CLI-ERRORS, 2026-10-17).** Errors print as `✖ <what happened and why>` followed by
  at most one `  Next: <step>` line. The HTTP status, server code and raw server text appear only with
  `--verbose`/`-v`/`--debug`. `--json` errors carry `headline` and `next` alongside `code`/`status`/`body`.
  In code, throw `QuoxUserError(headline, { next, exitCode })` (cli/lib/core/errors.js) and never
  append `\nHint:` to `err.message`. Add API-error mappings in `explainError()`, one strict test each
  in cli/test/core/errorContract.test.js. Some errors still render in the legacy form
  (`Error:` / `Status:` / `Hint:`) where existing tests pin that text (PIN ask 01K55JRA11YHH73TN67X9ZDEGM).
- `quox inbox respond <id|approvalId>` on a card that is already decided prints
  `✔ Already approved by <who> at <time>; nothing to do.` and exits 0 when the outcome matches.
  If it does not match, it prints `✖ ... your reject was not applied.` and exits 6. Not found exits 5.
  The auth respond route answers a closed card with 400 `code: already_resolved` + `resolution`
  {outcome, resolved_by_name, resolved_at, matches}. It also resolves a tool approvalId
  (aee_correlation_id) on GET and on respond, whatever the card's status. Gotcha: run it from an
  AGENT profile (e.g. the default `resident`) and the card is invisible to you (404). The respond
  then reports "Only a person can approve or reject inbox items"; use `quox -p <human> ...`.

Composing with `jq`:

    quox agent list --json | jq -r '.[] | "\(.agent_id)\t\(.name)\t\(.status)"'
Real output:
```
quoxpert_demo	Quoxpert Demo Agent	active
```

## Gotchas

- **`quox gripe` says "a platform authorization step failed (membership verify or credential resolve did not answer)"?**
  If your gripe TEXT contains 403/503/429 or the word "membership", that is the CLI misreading your own words echoed
  in GRIPE's confirm reply, not an outage (2026-10-17, fixed in 598fe53c8; until your quox CLI has it). Write the code
  in words ("forbidden by the allowlist"), or pass `--yes` (deterministic filing). Without `--yes`, gripe only proposes.

- **`quox volt verify` checks the hash chain AND the signatures (fixed 2026-10-07, quox#708, d61dda7ca).**
  Before that fix it only counted signatures (a forged signature PASSed). Now every signature is
  verified (Ed25519) and bound to the bundle's run/bundle id, first/last event hash and count.
  Read the trust line: `Signature: VALID (key f695..., embedded, not pinned)` proves the bundle
  is internally consistent, NOT who signed it. To prove the signer, pin the key:
  `quox volt verify b.json --key <base64-pubkey|file> [--strict]` (or `--trusted-keys k.json`);
  `--strict` fails an unpinned or unsigned bundle. Say "signature verified against the pinned
  Quox key" only when you passed --key.
  There is also no exporter for an offline single-envelope WARD receipt:
  `governance ward verify --envelope <id>` is a server verdict (and `timestamped` can flip from
  false to true minutes later, when the TSA token lands on the tip).
- **HITL from a chat tool call:** the agent gets an `approvalId`, but `inbox respond` takes the
  INBOX ITEM id (find it via `quox inbox list --awaiting-human`, which is see-only for agents).
  The `ops.tool.executed` envelope written when the call is HELD says `success:true` (quox#708);
  it is not proof that the command ran.
- **Timing a `quox` call? Know the fixed costs (measured 2026-10-09, CORTEX-BENCH).** Node start plus
  module load is ~0.4s before the first request; `NODE_EXTRA_CA_CERTS` adds ~0.15s. Two hidden costs
  were removed: `quox agent exec|attach <id>` no longer makes a roster round trip for an exact core
  id (was 60ms-1.4s), and `bin/quox.js` sets `--liftoff-only` because Node waited 350-700ms AFTER
  printing for V8 to tier up fetch's wasm HTTP parser. If a short command idles after its output,
  check that flag first. To split server vs client time, compare wall time with the response's
  `timings_ms.total`, or trace fetches with an `--import` hook that wraps `globalThis.fetch`.
- **Prove an agent answer's citations headlessly** (2026-10-10): `quox -o json chat --agent cortex --no-stream "<q>"`
  returns `session_id`; then `GET /api/brain/citations/<session_id>` on the collector (service key + X-Org-Id + X-User-Id)
  gives retrieved/cited/supported/contradicted and per-citation `support_method` (`semantic` = model-checked, `lexical` =
  word match). Finalize is async (entailment has a 3s budget): read `finalized: true` before trusting counts. Before
  08590987c the OpenAI path returned an `openai-<ts>` id its tools never used, so this always said `not_searched`.
- **More `quox brain` verbs (2026-10-11, BRAIN2-BRUTALOOP, driven live):**
  `quox brain context "<topic>" [--budget n]` = token-budgeted cited passages (what /brain/context injects);
  `quox brain search "<q>" --since 2026-10-01 [--until ...]` filters on the note's date (occurred_at, else updated_at);
  `quox brain related|history <noteId>` and `quox brain restore <noteId> <rev> --expected-hash <h>` work on
  NotesQ notes only (written by people or saved by Cortex), not on feed-imported notes, which have no revisions.
  Cortex has the same as tools: brain_context, brain_related, brain_history, brain_restore.
- **Check before you claim (2026-10-11):** `quox brain check "<claim>"` returns supported / contradicted /
  unknown with the notes behind it (lexical support plus the semantic check when enabled; a heuristic, not
  proof). Driven live: "$29 one-time" supported, "$29 monthly" contradicted by the same ruling, an undecided
  claim unknown. Record decisions with `quox brain decide "<what>" --why ...` (dedupe-checked, provenance
  attached) and batches of learnings with `quox brain distill file.jsonl` (idempotent keys, `--undo <batch>`).
- **Identity gotcha in attached sessions (2026-10-11):** while a session is attached as an agent, `quox` calls act
  as that agent by default (quox#772 acting identity), so a private note saved by the Resident account (or any
  other identity) returns 404 / is missing from search, by design. To act as the Resident, run the command
  outside the session's process tree (e.g. `systemd-run --user --pipe --wait quox ...`). Attaching also writes a
  `## Brain primer` (context pack for repo, branch, recent commits) into ATTACHED.md (`--no-prime` skips), and a
  detach handoff is saved as a private brain note (`--no-brain-note` skips).
- **Feed sources from the CLI (2026-10-11, driven live):** `quox brain sources` lists every Feed source with
  on/off, scope and last sync status (e.g. `skipped: no path`, `unsafe path, ...`); `quox brain source <type>
  --enable|--disable [--scope user|org] [--path p] [--roots a,b] [--config '<json>']` updates one. Host paths
  (folder, git, docs, transcript) need an org admin AND must sit under `FEED_FOLDER_ALLOWED_ROOTS` in the
  collector env, which an agent cannot widen (the read-time guard re-checks it every tick). The git source takes
  several repos via `--roots`. The `email` source (InboxQ mail) is off by default and refuses to enable without
  `--scope user --config '{"consent":true}'` because mail bodies go to the instance's Brain2 embedding model.
- **Attached Cortex memory scope (2026-10-11):** Cortex's memory_search merges the lease holder's memories with
  its own agent namespace (pass `memory_scope: "agent"` to narrow). Other attached agents stay agent-scoped.
- **Gardener (2026-10-11):** `brain_garden_apply` always files an Approvals card (archive only, restorable);
  the daily proposer runs only for orgs where a human admin ran `quox settings set BRAIN_GARDENER_ENABLED true`.
- **Note ids:** `--brief` prints 8-char prefixes that `quox brain note` cannot resolve; use `-o json` (works on
  brain verbs though not listed in `--help`) to get the full 40-char noteId before chaining.
- **Search can decline on purpose:** `insufficient: true` with `relevance.ungrounded: [...]` means the question
  names something (a product, codename) none of the top results mention. The hits are still returned, flagged.
- **`quox brain read <id>` only reads NotesQ (editable) notes**; any feed-ingested note (memory, quoxplan,
  commit, transcript) returns 404 there. Use `quox -o json brain note <id>` for the full body of any note
  (quox#740, 2026-10-09). A 404 from `read` is not proof the note is missing.
- Auth tokens are per-profile/per-instance; run `quox whoami` before blaming RBAC on a 403.
- Approval-gated commands return `pending_approval`, not a hard failure: poll `quox inbox list`.
- `quox status` can 401 on the collector's aggregate health endpoint even with a valid session;
  `quox doctor` (per-service) is the more reliable check, see Recipe 2.
- TUI (`quox` / `quox tui`, no subcommand) vs scripting mode are different code paths. Never
  screen-scrape the TUI; every capability it shows also has a scriptable subcommand.
- A brand-new org starts with zero agents/workflows/inbox items but one auto-installed
  first-party plugin (`star-alignment`); `No results.` is expected, not broken.
- `org switch` on a token issued before the org existed 403s with `not_org_member`. Re-run
  `quox login` after `org create`/`org switch` to get an org-scoped session (Recipe 1).

## When NOT to use this sub-skill

Chat-driven fleet ops from Claude, wielding QuoxMCP's tools directly → `quoxpert-mcp`. Building
plugins → `quoxpert-plugin-sdk`. Platform orientation → `quoxpert-core`.

## Approval-gated calls: always say who and why
Pass `--reason "why"` on `quox fleet exec` / `quox tool exec` for gated tools
and set `QUOX_SESSION=<session name>`; the approving human sees both. The CLI
auto-detects a source if `QUOX_SESSION` is unset and warns on stderr when
`--reason` is missing, but a stated session and reason are what the card
should carry.

## Needing a human: quox ask
When you hit a fork, a decision request, or any human-action request, do NOT ask it in your own terminal. Route it to the Approvals inbox so the owner answers everything from ONE HITL session:

```
quox ask --session <YOUR SESSION NAME> --title "<what, one line>" --why "<simple why>" \
  --options "a: Ship now|b: Wait for review|c: Drop it" --recommend a --default b --expires 2h --wait
quox ask --session <NAME> --title "Delete the old branch?" --yn --wait      # yes/no shorthand
```

- The human sees WHO (your session), WHAT, WHY and the options in `/approvals`, and answers with `/answer 3 b "after Friday"` (or `/approve 3`, `/deny 3 <reason>` for y/n).
- `--wait` blocks, prints heartbeats on stderr, then the chosen option key (and any note) on stdout with exit 0. Exit 2 means expired or denied: do NOT guess the answer, stop or take the safe path. `--default` is shown to the human, never applied for you.
- Without `--wait` it prints the decision id. Later: `quox ask status <id>` or `quox ask wait <id>`. If you hold a slot, the answer is also posted there.
- `--high-risk` makes the answer need the human step-up PIN. Plain decisions are not approvals of an action and need none.
- `--high-risk` REQUIRES `--justify "<2-3 plain lines the owner can judge>"` (CLI exits 2, the server 400s, without it). The card shows it on its JUSTIFY line; a loosening card with none defaults to No (owner, 2026-10-17: "u need to give me justification in future"). Say why it is safe, not what changed.
- **Test-edit approvals (a loosening) use ONLY `quox ask loosening --paths <every test file> --justify "<plain words>" [--why "<findings, before/after lines>"]`** (2026-10-19). It sets yn, high-risk and the title, normalises every path to repo-relative (absolute and worktree prefixes stripped) and refuses files that do not exist in the current repo. Run it from the worktree and name EVERY file the commit edits. A hand-written `quox ask --title "Approve loosening ..."` without `--high-risk` is refused; three owner PIN approvals were wasted on unusable asks (worktree-prefixed path, no --high-risk, 6 of 7 files unnamed).
- Never prove an ask feature by filing into the owner's live inbox: there is no withdraw verb, so a test ask sits there until it expires. Use a test profile, or render the card from a fixture.
- Keep `--why` simple: one or two sentences a human can decide from without opening your terminal.

## Ask the owner to run a command: quox slot say hitl --room --run
When the next step is a command only the human can run on their own machine (an npm publish that needs an OTP, a `gh auth login`, a sudo step), send it as a RUN REQUEST instead of pasting the command into prose:

```
quox slot say hitl --room --session <YOUR SESSION NAME> \
  --run 'cd ~/quox-plugin-sdk/packages/core && npm publish --access public' \
  "Needs your npm OTP to finish the SDK 0.2.1 publish."
```

- The quox TUI holding `hitl` shows `▶ <SESSION> asks you to run this here: <why>`, the FULL command in a code block, then `Run it? y/N/c`. y hands the terminal to the owner's own shell (stdio inherited, so OTP and login prompts work), then prints the exit code. n or Enter skips; c chats about it first.
- `--run` is ONE command on ONE line, max 2000 characters, no control/bidi characters (rejected 400 server-side and by the CLI). The collector stores it verbatim and never executes it.
- It is only offered from a verified sender (server-derived `author_identity`) in the same org; otherwise it is shown and refused. The ask expires after 10 minutes. Secret-shaped, destructive (`rm -rf`, `sudo`, `| sh`, `git push --force`, ...) or never-from-chat quox commands need the owner to type `run` instead of y.
- Never run it through the model and never offer it via `terminal_suggest_command`; the run request is the channel. Older TUIs (before 2026-10-16) and the Discord/Matrix bridge show only the why text, so put the command in the text too if the owner might read it elsewhere.

<!-- >>> tips (generated by sync-quoxpert-tips; do not edit) >>> -->
## Tips users see

Quox shows these one-line tips to users (`quox tips`). Know them so you can point at the right command.

- **Pick a conversation up again**: `/resume` (stable; shows: always)
- **Compact a long conversation**: `/compact` (stable; shows: always)
- **Copy the last code block**: `/copy code` (stable; shows: always)
- **See tokens and cost**: `/cost` (stable; shows: always)
- **Choose the provider and model**: `/model` (stable; shows: always)
- **The model chooser**: `/model` (beta; shows: always)
- **Favourite models**: `/model fav add` (beta; shows: always)
- **Run a shell command with !**: `!ls` (beta; shows: always)
- **Every live session in one view**: `/sessions all` (stable; shows: always)
- **Run Doctor**: `/doctor` (stable; shows: always)
- **File a gripe**: `/gripe` (beta; shows: always)
- **Turn a workflow into a Crystal**: `/crystal` (beta; shows when: crystals)
- **The skills library**: `/skills` (beta; shows when: skills)
- **InboxQ sorts your mail**: `quox mail zones` (beta; shows when: mail)
- **A durable address for this session**: `/slot` (stable; shows when: slots)
- **What is ready here**: `/capabilities` (stable; shows: always)
- **Let policy pick the model**: `/model auto` (beta; shows: always)
- **Name this session**: `/rename` (stable; shows: always)
- **Sessions from the shell**: `quox sessions` (stable; shows: always)
- **The dragon explains**: `/dragon explain` (stable; shows: always)
- **Find an email by asking**: `quox mail list` (beta; shows when: mail)
- **Budget your spend**: `quox budget` (beta; shows: always)
- **Share ! output with Quox**: `/share` (stable; shows: always)
<!-- <<< tips <<< -->

## Status rows: `quox rows` (CLI) and `/row` (window)
Load `make-a-status-row` to build one. CLI first (ROWS, 2026-10-17):

    quox rows add approvals --quox '/api/orgs/{org}/inbox/stats' --template '{{pending_approvals}} waiting for you' --label Approvals
    quox rows add fleet --quox /api/v1/fleet/summary --template '{{connection.connected}}/{{total_agents}} hosts up' --label Fleet --every 5m
    quox rows add nightly --plugin backup-q [--row <id>]     # a row the plugin's manifest statusRows declares
    quox rows add disk --cmd 'node ~/bin/disk-row.mjs'       # no --template = reads the status-row contract
    quox rows list [--now] | edit <id> | remove <id> | test [id|--url ...] | share | import <file> | contract

- Sources: `url` (no credentials sent to other hosts), `quox` (a path on your own Quox, `{org}` filled, your session),
  `plugin` (GET /api/v1/plugins/<id>/<path> via the collector proxy), `cmd` (this machine only). url/quox/plugin sync
  to the account; cmd never syncs, never shares, and an imported one needs `--trust-commands` + a y per command.
- No template = the contract `{text, label?, value?, tone?, trend?, link?}` (tone colours + glyph, bold value, trend arrow).
  `quox rows test --quox <path>` on JSON that is not a row lists the template fields.
- Secrets are refused at add/edit/share/import (token/key/sig params, token-shaped values, bearer in a command).
- From chat (quox_cli) `rows add|edit|test|import` and `rows list --now` are NEVER (SSRF/shell on the server); `rows list` reads.
- An open window re-reads within 60 s; `/row reload` at once. `/row new` / `/row edit <id>` are y/N card walks with a preview.
- Gotcha: a quox CLI from before ROWS drops a row with no template. Keep a template on rows a not-yet-updated CLI reads.

## Gotcha: quox window rows (`/row`)
- URL rows live in the user's server preference `quoxonRows`; the profile's `row_prefs` in config.json is only an offline cache and is overwritten from the server on every start. Editing config.json does nothing (use `quox rows`).
- Command rows (`type: cmd`) are local only, in `~/.config/quox/quoxon-rows.local.json` (`saveLocalCmdRows` in cli/lib/quoxon/rows.js), shared by every profile on the machine, and there are at most 3 rows in all (synced rows first).
- A command row has a 5 s budget. Anything slow (a big board fetch) must serve a cache and refresh in the background, or the row shows stale data with a "⚠ old" marker forever.
- Verify in a real window (`script -qc "quox -p <profile>"` and strip the ANSI escapes) before saying a row changed. (2026-10-15: a row was reported installed three times while the old one kept showing.)

## Gotcha: measuring TUI turn latency from a script (first-text, 2026-10-16)
- `quox chat` (legacy) runs a NON-streaming route (turn ids `CLI_...`, no warm CLI pool, no cli_init/first_text timing). It does not reproduce what the TUI does.
- (2026-10-19) Wrapping `quox chat` in a pty (`script`, tmux) or adding `--trace` does NOT change that: still `CLI_` turns, and the summary's `first_text_ms` is END of turn (it equals total_ms). Comparing those to the owner's QXN_ first_text_ms overstates latency.
- Use `quox -p <profile> --print "<msg>" --agent <id> --turn-id QXN_<ms>_<tag> --output json` instead: same QXN_ stream path as the TUI, and the `--turn-id` lets you grep the exact `[TurnTiming] turn=<id> phase=summary` line in `docker logs quox-collector`.
- `--conversation <id>` must name an EXISTING conversation (a fresh UUID fails with "conversation not found"). Create it with a first turn and read `conversation_id` (QXC_...) from the JSON output.

## Offload: run heavy commands on a pool worker (lease, status, renew, release)

`quox offload` syncs a directory to a leased pool worker VM and runs your command there, with live output and the same exit code. The lease is taken on first use and reused after.

```bash
quox offload -- npm test                 # run on the shared worker (leases one if you have none)
quox offload --dir ./my-project -- make  # sync a specific directory
quox offload status                      # vmid, ip, lease expiry, synced dirs
quox offload --fresh -- true             # renew: release the current worker, lease a new one, reinstall deps
quox offload release                     # release (destroy) your worker via the pool
quox offload --worker big -- make        # your own named worker (own lease and size)
quox offload status --worker big         # status of the named worker
```

| Flag | Meaning |
|------|---------|
| `--dir <path>` | directory to sync (default: git toplevel of the current directory) |
| `--fresh` | release the current worker, lease a new one, reinstall dependencies |
| `--worker <name>` | use your own named worker instead of the shared one (or set `QUOX_OFFLOAD_WORKER`) |
| `--cores <n>` / `--memory-gb <n>` / `--disk-gb <n>` | size of a newly leased worker |

There is no separate "renew" verb: check expiry with `quox offload status`, then `quox offload --fresh -- true` to take a new lease.

## Gotcha: never run `quox offload` from $HOME (2026-10-17)
**Adding a new `quox` CLI verb (leaf) needs two registrations in the same commit,** or main goes red: (1) a row in the collector's quox_cli policy file, classifying what chat may do with it (for example, a TTY-only replay like `quox welcome` is refused from chat with a reason), checked by services/collector/test/quoxCliPolicy.test.js; (2) a claim in the matrix domain map, checked by the matrix-drift CLI-tree tests. Never add the leaf to the pinned "uncovered" list to get green. (2026-10-17: `quox welcome` landed without both and turned main red.)

**tmux pty captures: ALWAYS use a private socket.** `tmux kill-server` (or `kill-session`) with no `-L`/`-S` acts on the shared default server, which every session on the box lives in. On 2026-10-17 at 20:25:06 a QUOXON UX worker cleaning up its test pane ran `tmux kill-server`, and every owner and Claude session on <dev-box> was booted. Every tmux call in a test or capture runs as `tmux -L <your-own-name> ...`: new-session, send-keys, capture-pane, kill-server.

`quox offload` rsyncs the current directory to the shared pool worker. Run from `~`, it copies the whole home directory, fills the worker's disk ("No space left on device"), and blocks every session's `quox-land`. To lease only, run it from an empty directory (`mkdir -p /tmp-free/scratch/empty && cd` there, then `quox -p <human> offload --fresh -- true`). For tests, run it from the worktree.

## Gotcha: `quox offload -- "<compound command>"` runs the string as a path (2026-10-17)
After `--`, offload execs the arguments, not a shell line. `quox offload -- 'cd services/collector && npx vitest run'` fails with `<synced dir>/cd services/collector && ...: No such file or directory`. Put compound steps in a script inside the synced worktree (untracked is fine) and run `quox offload -- bash ./run.sh`, or pass `bash -c '<line>'`. A named worker (`--worker <name>`) cannot be leased from an agent profile (HTTP 403); agent sessions reuse the shared worker. Two offloads from different worktrees can run on the shared worker at once (each syncs to its own dir).

## Installing Claude Code / Codex on a server (added 2026-10-19, LAZY-AI-CLI e802e90ce)
Public prebuilt images ship WITHOUT the Claude CLI (INCLUDE_CLAUDE_CLI=false; Codex is in the image), so a Claude sign-in
cannot work there until it is installed. `quox provider install claude-code|codex [--yes]` makes the server download the
vendor's own npm package (exact latest version, size shown first) as the quox user into /var/lib/quox/cli-tools on the
collector-data volume (survives image updates and restarts), runs claude's install.cjs, verifies `--version`, and flips
claude_cli with no restart. Human instance admin only (403 otherwise; an org admin of a self-signup org is NOT enough).
A terminal gets y/N; `--yes` works for a non-agent script; an AGENT (QUOX_SESSION / QUOX_AGENT_ID / a claude ancestor) gets
a high-risk approval card even with --yes, and the server re-reads that card (Yes, this install, <1h, single use).
The TUI offers it as a y/N card on `/model claude-cli` and once at first launch. Already installed = "Nothing to do".
Gotcha: a local build (QUOX_IMAGES=build or the failed-pull fallback) DOES bake the Claude CLI in, unlike prebuilt (gripe filed);
to reproduce prebuilt on a VM, put docker-compose.images.yml in COMPOSE_FILE before setup.sh.

## Gotcha: connecting an AI provider on a fresh install (added 2026-10-19, WORKER2 + QUOXON)
A fresh install answers no chat until a provider is connected. The CLI verbs now exist (quox#1281, ae3cd7b60): `quox provider list | connect <kind> | test [<kind>]`, the same calls as the TUI's `/connect`. The collector runs in a container, so `127.0.0.1` means the container: bind Ollama to the host LAN (`OLLAMA_HOST=0.0.0.0` in its systemd unit) and connect `http://<host-LAN-IP>:11434`. A local qwen2.5:7b needs an AVX2 CPU: check `grep -c avx2 /proc/cpuinfo` first (<hypervisor> VMs and <dev-box> have none; <hypervisor> is the AVX lane).

## Gotcha: adding a CLI verb means regenerating every generated CLI snapshot together (2026-10-20, SDK-TEAM)
A new `quox` verb (e.g. `quox fleet ping`, `quox research domains`) is not done when its command file and tests are.
Several generated snapshots must be regenerated TOGETHER on fresh main (a rebase means you regenerate, never merge them):
`node scripts/matrix/cli-tree.mjs && node cli/scripts/export-leaf-methods.mjs && node scripts/matrix/leaf-policy.mjs && node services/collector/scripts/sync-cli-leaf-policy.mjs && node cli/scripts/export-leaf-tree.mjs && node cli/scripts/export-tui-slash.mjs && node cli/scripts/export-command-tree.mjs`
then confirm each `--check` (leaf-policy, sync-cli-leaf-policy, export-leaf-tree, export-tui-slash, export-command-tree) says current.
- Missing `export-command-tree.mjs` left `services/collector/config/cliCommandTree.json` stale (matrix-drift #5/#9), and VULCAN caught it after landing.
- Check the leaf CLASS the policy assigns: the method scan reads the whole command FILE, so a read verb sharing a file with a PATCH verb (e.g. `research domains list` beside `add`/`remove`) comes out `write`. Fix it with a reasoned entry in `OVERRIDE` in scripts/matrix/leaf-policy.mjs; never hand-edit the JSON.
- Writes that change what agents may fetch or do should be `write` (approval card from chat, a direct ask exempt), not `read`.
- Run the regeneration on <dev-box> with `quox-deps` linked: offload false-reds the cli-parse checks.
