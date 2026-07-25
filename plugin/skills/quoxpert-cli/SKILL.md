---
name: quoxpert-cli
description: "Operate QuoxCORE from the terminal with the quox CLI and TUI —
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
    generated_at: 2026-07-25
    quox_version: ">=0.1 pre-1.0"
---

# Quoxpert — CLI & TUI

## What this is

`quox` is the terminal client for a QuoxCORE instance (Node ≥20; bins `quox` and `quoxcli`,
package `quoxcli`). Everything the dashboard does with clicks, the CLI does with commands — same
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

    npm install -g quoxcli          # or the curl installer from quox.ai/downloads
    quox login --email you@example.com --password '...'   # or omit flags for prompts
    quox whoami                     # confirms session + active org
    quox doctor                     # verifies collector + services are reachable

Session tokens are written to `~/.config/quox/config.json` (0600 permissions) under a named
**profile** — never ask the user to paste a token; tell them to run `quox login` themselves.
Multiple instances (local/staging/production) are separate profiles:

    quox config profile add staging --url https://staging.quox.ai
    quox config profile use staging
    quox --profile production status     # or -p, one-shot override

## Command map

<!-- GENERATED:command-map -->
| Command | Purpose |
|---|---|
| `quox login` / `logout` / `whoami` / `signup` / `mfa` | authenticate, session, MFA |
| `quox status` / `health` / `doctor` | platform-wide status / per-service health |
| `quox config` | CLI config + connection profiles |
| `quox org` | orgs — list, create, switch, members, divisions, audit |
| `quox team` / `department` | team + department management |
| `quox agent` | agents — list, get, create, update, delete, activate/deactivate, tool assignments |
| `quox tool` | tool catalog — list, create, publish, install |
| `quox workflow` | workflows — list, create, run, publish, steps, `apply`/`validate` (declarative) |
| `quox objective` | autonomous multi-step goals — create, start, approve, get (DAG) |
| `quox assistant` | assistants — list, create, deploy, fork |
| `quox fleet` | fleet monitoring — status, summary, agents, tools, exec, watch |
| `quox chat [message]` | chat with CommanderQ or any agent, streaming by default |
| `quox memory` | memories — list, create, search, export, stats |
| `quox entity` | knowledge-graph entities |
| `quox backup` | backups — list, create, verify, restore, schedule |
| `quox inbox` | HITL inbox — list, get, respond (approve/reject/defer/resolve), stats |
| `quox run` | workflow runs — list, create, cancel, resume |
| `quox file` | file storage — upload, download, list, delete |
| `quox admin` | platform administration |
| `quox aee` | Agent Envelope Exchange protocol tooling |
| `quox integration` | integrations |
| `quox consent` | data-processing consent |
| `quox setup` | first-time setup |
| `quox watch` | live TUI dashboards (fleet, services) |
| `quox tag` | tags |
| `quox scope` | read-only scope view (manage via org/division/team) |
| `quox notification` / `prompt` | notification settings / user prompt library |
| `quox plugin` | org-installed plugins — list, install, uninstall, data, secrets, assign |
| `quox powers` | POWERS MCP endpoints — detect, deploy, deploy-repo, status, finalize, update, archive |
| `quox conversation` | conversations |
| `quox vault` | QuoxVault credentials — list, create, rotate, test, types, scan |
| `quox volt` | VOLT evidence bundle verify/inspect/export/summary |
| `quox governance` | policies, WARD chain, VOLT evidence + certification |
| `quox skills` | QSKL Crystal library — list, show, run, review, promote, library |
| `quox monitoring` / `mon` | platform health, Docker fleet, Wazuh, AGH-chain leaderboard |
| `quox trigger` | webhook/schedule/event trigger subscriptions — view + activate/deactivate |
| `quox webhook` / `sso` / `role` / `domain` / `security` / `scim` | enterprise admin surfaces |
| `quox llm-policy` | org LLM routing policy — get/set/test |
| `quox budget` | quoxflow spend/usage budgets |
| `quox trace` | Trace Replay & Visualization — list, get, simulate, compare, replay |
| `quox tui` | launch the interactive TUI |
| `quox completion <shell>` | shell completions (bash/zsh/fish) |
<!-- /GENERATED:command-map -->

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
creation — re-running `quox login` after `org create` is what actually rescopes the session.

### 2. `status` vs `doctor` — health checks
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
    quox inbox list --pending
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
Real output (truncated, live library — these are Quox's own agent-facing Crystals, not
Quoxpert):
```
 ID                            Name                              Category               Edition
 01KRH1RY0FQQAFK30XGNGV3A1T    voice-transcribe-audio            voice/operations       stable
 01KRH1RXZZCR3JPAJ6MBPH3690    voice-segment-on-silence          voice/operations       stable
 01KRH1RXWVT2ENYWC5W0KHYAZD    vault-secret-rotate               security               stable
 01KRH1RXTXHYCKS6T5HB5XNW7W    prom-range-query                  ops/health             stable
```
`skills run <id>` takes the skill's `sourceWorkflowId`, not the display ID column — read it from
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
`vault list` on a fresh org returns `No credentials found.` — create one with
`vault create` (interactive) before wiring an integration.

### 9. Deploy a live MCP endpoint as a governed POWERS agent
    quox powers detect --url https://example.com/mcp
    quox powers deploy --url https://example.com/mcp --agent-id my_mcp_agent \
      --name "My MCP Agent" --auth-kind bearer --auth-value "$MCP_TOKEN"
`detect` probes the endpoint and lists its tools before you commit to deploying; `deploy` is
one-shot (no container build) for a live MCP server you already trust. For a GitHub repo that
needs a build, use `powers deploy-repo` instead, then poll `powers status <toolDefId>` and
`powers finalize <toolDefId>` when the build completes.

### 10. Export → edit → re-apply a workflow declaratively
    quox workflow get <id> -o json > wf.json     # or: quox workflow export, if your version has it
    # edit wf.json — top-level {name, definition:{name, nodes:[...], edges:[...]}}
    quox workflow apply -f wf.json               # POST if no id, PUT+diff-preview if it has one
    quox workflow validate <id>                   # validates the STORED workflow, not the local file
Gotcha (found live): `apply` 400s on a syntactically-valid-looking JSON if `definition.nodes[].type`
isn't a node type quoxflow recognizes (e.g. a bare `util:log` was rejected on this dev instance) —
check `--debug` to see the exact POST body/response, and prefer round-tripping an existing
workflow's `get` output as your edit base rather than hand-writing a definition from scratch.

### 11. Track a fleet across hosts
    quox fleet status
    quox fleet summary
    quox watch fleet --interval 5
`fleet status`/`summary` are one-shot reads; `watch fleet` is a live-refreshing TUI dashboard —
don't script against its output, use `fleet status --json` (or `mon`) for automation instead.

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

## Output contracts & scripting

- `-o/--output <table|json|csv|quiet>` on read commands; `--json` is shorthand for `-o json`;
  `-q/--quiet` prints IDs only (one per line — pipe-friendly).
- `--org <slug>` overrides the active org for a single invocation without switching context.
- `--debug` prints the exact HTTP method/URL/body and the raw response — the fastest way to
  diagnose a 400/401/403 without guessing.
- `--dry-run` shows what a mutating command would do without executing it; `-y/--yes` skips
  confirmation prompts (needed for CI).
- Exit codes: 0 on success, non-zero on any error (including `pending_approval` outcomes — check
  the message, not just the exit code, to distinguish "needs a human" from "actually failed").

Composing with `jq`:

    quox agent list --json | jq -r '.[] | "\(.agent_id)\t\(.name)\t\(.status)"'
Real output:
```
quoxpert_demo	Quoxpert Demo Agent	active
```

## Gotchas

- Auth tokens are per-profile/per-instance; run `quox whoami` before blaming RBAC on a 403.
- Approval-gated commands return `pending_approval`, not a hard failure — poll `quox inbox list`.
- `quox status` can 401 on the collector's aggregate health endpoint even with a valid session;
  `quox doctor` (per-service) is the more reliable check — see Recipe 2.
- TUI (`quox` / `quox tui`, no subcommand) vs scripting mode are different code paths — never
  screen-scrape the TUI; every capability it shows also has a scriptable subcommand.
- A brand-new org starts with zero agents/workflows/inbox items but one auto-installed
  first-party plugin (`star-alignment`) — `No results.` is expected, not broken.
- `org switch` on a token issued before the org existed 403s with `not_org_member` — re-run
  `quox login` after `org create`/`org switch` to get an org-scoped session (Recipe 1).

## When NOT to use this sub-skill

Chat-driven fleet ops from Claude, wielding QuoxMCP's tools directly → `quoxpert-mcp`. Building
plugins → `quoxpert-plugin-sdk`. Platform orientation → `quoxpert-core`.
