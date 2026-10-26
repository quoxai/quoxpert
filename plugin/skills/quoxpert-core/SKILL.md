---
name: quoxpert-core
description: "Orient on the QuoxCORE / Quox platform: what it is, the five pillars, the five governed concepts (crystals/agents/workflows/tools/governance), service topology, and which Quoxpert sub-skill to load next. Load when the user asks 'what is Quox', needs platform orientation, is debugging which service owns a symptom, or is deciding between the CLI/MCP/dashboard surfaces before doing anything else."
argument-hint: "<question, e.g. 'what is Quox' or 'which service handles chat'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard
    sources:
      - repo: quox-dashboard
        path: CODEBASE_MAP.md#metrics
      - repo: quox-dashboard
        path: docs/CONCEPTS.md
      - repo: quox-dashboard
        path: src/config/serviceRegistry.js
      - repo: quox-dashboard
        cmd: "curl -s <collector_url>/health"
    generated_at: 2026-07-25
    quox_version: ">=0.1 pre-1.0"
license: LicenseRef-SkillRights-Reserved-1.0
---

# Quoxpert: QuoxCORE Platform Orientation

## What this is

Quox (product name for the QuoxCORE platform) is a **governed multi-agent operations platform**.
A fleet of specialist agents, orchestrated by CommanderQ (QUOX), runs auditable workflows,
executes tools, remembers across sessions, pauses for human approval (HITL), and emits
tamper-evident evidence of everything it does. This sub-skill is the orientation layer: what the
platform *is*, how its pieces fit together, and which of the other Quoxpert sub-skills to load
once you know what you're doing.

**The five pillars:**

1. **Auth + Security + Teams**: user auth, RBAC, tenant isolation, org/division/team scoping.
2. **Organization Model**: orgs, divisions, teams, asset registry, scoped resources.
3. **Human-in-the-Loop (HITL)**: inbox, approvals, Slack/Telegram/email escalation.
4. **Workflow Builder**: visual + declarative workflow creation on the quoxflow engine.
5. **Memory Tiering**: episodic/semantic/entity memory, free/premium split.

## When to use this sub-skill

- The user asks "what is Quox" / "what can this platform do."
- You need to route a task to the right sub-skill (CLI vs MCP vs dashboard vs fleet vs SDK).
- You're debugging and need to know which service owns a symptom (chat down → check collector;
  login down → check auth; workflow won't run → check quoxflow).
- You need the canonical definition of a concept (crystal, agent, workflow, tool, governance).
- You're orienting on a brand-new Quox instance and don't yet know its shape.

## When NOT to use this sub-skill

- Actually running commands → `quoxpert-cli`.
- Wielding QuoxMCP's tools from inside Claude → `quoxpert-mcp`.
- Building or inspecting workflow internals (nodes, AOCL pipeline, triggers) → `quoxpert-flow`.
- Fleet/SSH operations across hosts → `quoxpert-bastion`.
- Building a `.quoxplugin` extension → `quoxpert-plugin-sdk`.
- Reading raw AEE/AOCL/VOLT/WARD evidence → `quoxpert-protocols`.
- Installing/upgrading/backing up an instance → `quoxpert-deploy`.

## Install & connect

Quoxpert itself needs no connection to reason about Quox in the abstract, but most orientation
tasks are more useful against a live instance:

    quox status              # platform-wide status (see Gotchas: collector aggregate can 401)
    quox doctor               # per-service health, the more reliable check
    curl -s <collector_url>/health   # collector's own /health is public, no auth required

**Never ask the user to paste a secret.** Session tokens live in `~/.config/quox/config.json`
(written by `quox login`, see `quoxpert-cli`); the collector's `INTERNAL_SERVICE_KEY` lives in
that instance's `.env` file, which only the instance operator has access to. If you need
authenticated access, tell the user to run `quox login` themselves, or check whether an MCP
session (`quoxpert-mcp`) is already configured.

## Platform map

<!-- quoxpert:generated:start counts -->
| Metric | Count |
|---|---|
| Plugins | 51 |
| Services (registry) | 12 |
<!-- quoxpert:generated:end counts -->

**Service topology** (default docker-compose profile; ports as seen on a dev box, a production
install may front these behind a single reverse-proxy origin):

| Service | Port | Role |
|---|---|---|
| dashboard | 3000 (443 in-container) / 80 | React SPA: the UI |
| auth | 3101 | login/session/org/RBAC: source of truth for identity |
| collector | 9848 | central API gateway: chat, tools, agents, workflows, most CLI traffic |
| quoxflow | 3200 | workflow engine: execution, triggers, schedules, budgets |
| memory | 3103 | SQLite+FTS5 memory service |
| files | 3102 | file storage |
| orchestrator | 3100 | agent orchestration |
| tasks | 3104 | objective/task decomposition |
| qdrant | 6333 | vector store for memory |
| powers-host | 9849 | POWERS MCP endpoint / hosted-repo tool containers |
| repobrain | 3105 | code-intelligence engine with its own surface, see `quoxpert-repobrain` |

**The five governed concepts** (canonical definitions on the website, this repo's copy is a
summary only, the website wins on disagreement):

| Concept | URL | One-line |
|---|---|---|
| Crystals | https://quox.ai/docs/concepts/crystals | Reusable, governed skills formed from executions: Quox's *internal* skill system (see Gotchas: not Quoxpert). |
| Agents | https://quox.ai/docs/concepts/agents | Single agent vs agentic loop; persona-pinned / tool-using / browser modes; `team:invoke` composition. |
| Workflows | https://quox.ai/docs/concepts/workflows | Node-based execution graphs (22 node types / 5 groups), live execution overlay, versioning. |
| Tools | https://quox.ai/docs/concepts/tools | Four install paths (OpenAPI / MCP / Repo / Script), agent-tool assignment matrix. |
| Governance | https://quox.ai/docs/concepts/governance | AOCL evidence chain, four-scope budgets, approval policies, multi-tenant enforcement (ET-ENFORCE), audit export. |

## Recipes

### 1. Confirm you're talking to a live instance
    curl -s http://localhost:9848/health
Real output (dev box):
```
{"status":"healthy","service":"quox-collector","version":"4.2.0","agents_connected":12,"ward_api":"mounted","uptime_seconds":9834}
```
The collector's `/health` is public (no auth). This is the cheapest liveness check before doing
anything else, no login, no org context required.

### 2. Full per-service health check
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
`doctor` checks each service individually and is more reliable than `quox status`, see Gotchas.

### 3. Identify which service owns a symptom
| Symptom | Check |
|---|---|
| Login/signup fails | `curl -s <auth_url>:3101/health`; auth is the source of truth for identity |
| Chat / agent calls fail | collector (9848); nearly all CLI and dashboard traffic routes through it |
| Workflow won't run / trigger doesn't fire | quoxflow (3200) |
| Memory search returns nothing | memory service (3103); also check Qdrant (6333) if hybrid search |
| MCP tool deployed but never builds | powers-host (9849) |
| File upload/download fails | files service (3102) |

### 4. Look up the canonical definition of a concept
Don't guess at "what is a crystal" from memory: the website is canonical:
    open https://quox.ai/docs/concepts/crystals
Use the Platform map table above for the other four (agents, workflows, tools, governance). If
the website and any local doc disagree, the website wins.

### 5. Check the agent roster on a live instance
    quox agent list --json
Real output (fresh org, one custom agent created for this verification):
```json
[
  {
    "agent_id": "quoxpert_demo",
    "name": "Quoxpert Demo Agent",
    "level": 2,
    "status": "active",
    "domains": [],
    "capabilities": []
  }
]
```
A fresh org starts with **zero** custom agents: the 37-agent "core registry" (SENTINEL, NOVA,
CIPHER, etc.) is the platform's built-in roster, distinct from org-created agents like the one
above. See `quoxpert-cli` for the full `agent` command reference.

### 6. Check what's pre-installed on a fresh org
    quox plugin list
Real output (fresh org, seconds after creation):
```
 Plugin ID         Version    Enabled    Installed By          Installed              Upgraded
 star-alignment    0.3.7      yes        system:first-party    2026-07-11 05:22:01    -
```
Every new org gets `star-alignment` auto-installed as a first-party plugin. Don't be surprised
by plugin activity you didn't trigger.

### 7. Understand the governance posture before automating anything
Quox agents don't execute destructive actions silently. Two mechanisms to expect:
- **DEFCON levels**: tools carry a DEFCON/risk tier; higher tiers gate on approval.
- **HITL (Human-in-the-Loop)**: an action that needs sign-off lands in the inbox as
  `pending_approval`, not a failure. `quox inbox list --status pending` (see `quoxpert-cli`) surfaces
  these. Teach Claude to *expect* this, not fight it: a `pending_approval` response means "wait
  for a human," not "the command failed."

### 8. Distinguish Quoxpert from things it sounds like
See the root `quoxpert` skill's "What Quoxpert is NOT" section for the full QSKL /
QuoxNucleus / dev-skill / QUOX-DEEP disambiguation. Load that skill if this comes up.

### 9. Trace a request end-to-end for debugging
Dashboard (browser) → collector (9848, API gateway) → downstream service (auth / quoxflow /
memory / powers-host) → response. The CLI talks directly to the same collector + per-service
ports (see Platform map) rather than going through the dashboard. When something "works in the
dashboard but not the CLI" (or vice versa), the divergence is almost always in which port/service
the two clients hit: check the CLI's `--debug` flag (see `quoxpert-cli`) to see the exact URL.

### 10. Check RBAC scope for the active session
    quox whoami
Real output:
```
  User      Quoxpert Demo
  Email     demo@example.com
  Org       Quoxpert Demo Org (quoxpert-demo-org)
  Role      owner
  MFA       disabled
  Session   expires in 60m
```
Role gates which subcommands succeed (e.g. `webhook`/`sso`/`role`/`scim` are enterprise-tier and
admin-gated). A 403 is a signal to check `whoami`, not to assume the CLI is broken.

### 11. Pick the right sub-skill before starting
| Task shape | Sub-skill |
|---|---|
| Terminal/scripted control | `quoxpert-cli` |
| Chat-driven tool use from inside Claude | `quoxpert-mcp` |
| Workflow internals, nodes, triggers | `quoxpert-flow` |
| SSH/fleet ops across hosts | `quoxpert-bastion` |
| Building a Quox plugin | `quoxpert-plugin-sdk` |
| Verifying evidence bundles / chains | `quoxpert-protocols` |
| Installing/upgrading/backing up the instance | `quoxpert-deploy` |

## Output contracts & scripting

`quoxpert-core` has no command surface of its own: it's an orientation layer. For programmatic
access, the platform's actual contracts live one level down:
- Terminal scripting (`--json`/`--quiet`/`-o csv`, exit codes) → `quoxpert-cli`.
- Tool-call contracts (MCP resources/prompts) → `quoxpert-mcp`.
- Raw REST: every service exposes `GET /health` unauthenticated (see Recipe 1); everything else
  requires a bearer session token from `quox login` or an `INTERNAL_SERVICE_KEY` header the
  instance operator controls: never ask a user to paste either into chat.

## Gotchas

- **`quox status` can 401 even when authenticated.** On a live dev instance, `quox status --debug`
  showed `GET /api/v1/health/aggregate` returning 401 with a valid session. Prefer `quox doctor`
  (per-service checks) when `status` looks broken: it's the more reliable read.
- **A brand-new org is empty by design.** No agents, no workflows, no inbox items. Don't read
  "No results." as a bug; it's the correct state for a fresh org (except the auto-installed
  `star-alignment` plugin, Recipe 6).
- **Org-aware sessions require a re-login after `org switch`/`org create`.** The JWT issued at
  login is org-scoped; switching org context server-side doesn't retroactively rewrite the token
  in your local session. Re-run `quox login` (or `quox org switch` then re-login) to pick it up.
- **"Quox" is mixed-case brand styling** (not "QUOX") in all user-facing prose.
- **Post-`COLLECTOR-AUTH` note:** some previously-open collector routes may move to default-deny
  over time; if a recipe here starts 401ing where it didn't before, that's the platform tightening
  auth, not a Quoxpert bug. Re-verify against `quox doctor` and the instance's release notes.

<!-- >>> tips (generated by sync-quoxpert-tips; do not edit) >>> -->
## Tips users see

Quox shows these one-line tips to users (`quox tips`). Know them so you can point at the right command.

- **Talk to a specialist agent**: `/attach` (stable; shows when: agents)
- **Risky actions wait for you**: `/approvals` (stable; shows when: approvals)
- **Read back the evidence chain**: `/proof` (beta; shows when: receipts)
- **Memory with provenance**: `/memory` (beta; shows when: memory)
- **Search your org knowledge**: `quox brain search` (beta; shows when: qortex)
- **Hats narrow the toolbox**: `quox hat list` (beta; shows: always)
- **Decide approvals in the terminal**: `/approve` (stable; shows when: approvals)
- **Every AOCL layer of a turn**: `/aocl` (stable; shows: always)
<!-- <<< tips <<< -->
