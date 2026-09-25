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
    generated_at: 2026-09-25
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

### 4. List and approve a pending HITL inbox item
    quox inbox list --status pending
    quox inbox get <itemId>
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

Composing with `jq`:

    quox agent list --json | jq -r '.[] | "\(.agent_id)\t\(.name)\t\(.status)"'
Real output:
```
quoxpert_demo	Quoxpert Demo Agent	active
```

## Gotchas

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
