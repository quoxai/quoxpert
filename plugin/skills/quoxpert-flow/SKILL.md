---
name: quoxpert-flow
description: "Operate the quoxflow workflow engine — AEE envelopes, the AOCL
  7-layer control pipeline, 18 node executors, the expression engine (vm
  sandbox), the policy DSL, the HITL approval gate, and evidence chains — via
  the quox CLI's workflow/run/trigger/objective/skills command groups. Load
  when the user wants to create, run, inspect, debug, or govern a Quox
  workflow, an autonomous objective, or a QSKL crystal skill."
argument-hint: "<task, e.g. 'run a workflow and inspect its envelopes' or 'approve a paused objective'>"
metadata:
  quoxpert:
    source_repo: quoxflow (engine) + quox-dashboard (cli/)
    sources:
      - repo: quoxflow
        path: CLAUDE.md
      - repo: quoxflow
        path: src/pipeline/layers/index.ts
      - repo: quoxflow
        path: src/executors/
      - repo: quoxflow
        path: src/approval/
      - repo: quoxflow
        path: src/evidence/
      - repo: quox-dashboard
        path: CODEBASE_MAP.md#cli-commands-quoxcli
      - repo: quox-dashboard
        cmd: "node cli/bin/quox.js workflow|run|trigger|objective|skills --help"
    generated_at: 2026-07-25
    quox_version: ">=0.1 pre-1.0"
---

# Quoxpert — QuoxFlow Workflow Engine

## What this is

QuoxFlow is Quox's auditable, n8n-compatible workflow engine (TypeScript, ULID
IDs, AEE envelope protocol). Every workflow run passes through the **AOCL
7-layer control pipeline** — Ingress → Identity → Policy → Context → Execute
→ Verify → Assemble — and each layer emits an AEE envelope, giving you a full
audit trail for any run, not just its final output. Workflows are built from
**18 node types** (`call`, `transform`, `condition`, `switch`, `loop`, `try`,
`catch`, `throw`, `wait`, `log`, `subworkflow`, `parallel`, `merge`,
`aggregate`, `webhook`, `start`, `end`, `noop`), with a sandboxed **expression
engine** (`vm.createContext`, 1s timeout, `${input.field}` / `${variables.x}`
syntax — `env` is always `{}`, never exposed for security). Destructive or
sensitive steps can be gated behind the **HITL approval engine**, and
everything durable is captured by the **evidence** subsystem.

QSKL "Crystals" (`quox skills`) are QuoxFlow workflows that have been
**crystallised** — proven-good executions promoted into a reusable, versioned
skill library that Quox's own agents (and you, via the CLI) can invoke by ID.

## When (not) to use this sub-skill

Use this when the user wants to: build/run/inspect a workflow, chase down
what happened inside a run (envelopes, layer-by-layer), work with autonomous
**objectives** (multi-step goal decomposition), manage trigger subscriptions
(webhooks/schedules/events), or run/promote a QSKL skill.

**Do NOT use this for:**
- General terminal control of a Quox instance unrelated to workflows/skills
  (auth, teams, plugins, backups) → the CLI-wide skill.
- Chat-driven fleet ops through Claude's own MCP tool calls rather than the
  `quox` binary → the MCP-composition skill.
- Building a *new* `.quoxplugin` extension → the plugin-SDK skill.
- QSKL vs Quoxpert itself: see the root `quoxpert` skill's "What Quoxpert is
  NOT" section for the full disambiguation.

## Install & connect

QuoxFlow ships as part of the QuoxCORE stack — there's nothing separate to
install. Point the `quox` CLI at your instance and authenticate; workflow
data is served through the same collector/CLI auth path as everything else.

    npm install -g quoxcli          # or the curl installer from quox.ai/downloads
    quox login                      # browser/device flow against your instance
    quox status                     # confirms collector + quoxflow are reachable

QuoxFlow never needs a secret typed into chat — auth is a token issued by
`quox login`, stored in your local CLI profile. If a recipe below needs an
org, pick one first: `quox org list` / `--org <slug>` on any command.

## Command map
<!-- quoxpert:generated:start command-map -->
| Command | Purpose |
|---|---|
| `quox workflow` | list, get, create, update, delete, run, publish, apply (declarative YAML/JSON), validate, import-n8n, import-objective |
| `quox run` | list, get, create, cancel, resume — workflow **runs** (executions of a published workflow) |
| `quox trigger` | webhooks, schedules, events (list active subscriptions), workflow-activate/deactivate |
| `quox objective` | create, list, get, start (decompose into tasks), approve (execute the decomposed plan) |
| `quox skills` | list, show, run, review (QSKL-SAFETY queue), library, from-execution (crystallise), promote-draft, rollback-to-version |
| `quox aee` | store, get, query, conversations, stats — raw AEE envelope inspection |
<!-- quoxpert:generated:end command-map -->

## Recipes (hand-authored — the actual expertise)

### 1. List workflows and see what's published
    quox workflow list
    quox workflow list --status active

### 2. Create a workflow declaratively and apply it
A workflow file has `id` (omit for create), `name`, and a `nodes` array —
each node has `id`, `type` (e.g. `flow:condition`, `data:transform`,
`trigger:webhook`), `name`, and a `config` object. Expressions inside
`config.expression` run in the sandboxed engine, e.g.
`input.amount >= 100 ? 'large-discount' : 'no-discount'`.

    quox workflow apply -f my-workflow.json
    # POSTs (create) if the file has no id; PUTs with a diff-preview if it does

### 3. Validate before you trust it
`workflow validate` checks the STORED workflow by id — always `apply` your
latest file first, then validate:

    quox workflow apply -f my-workflow.json
    quox workflow validate <workflowId>

### 4. Publish, then run
A workflow must be published/active before it can execute:

    quox workflow publish <workflowId>
    quox workflow run <workflowId> --input '{"amount": 500, "isVip": false}'

### 5. Track a run and inspect its envelopes
    quox run list --limit 20
    quox run get <runId>
    quox aee query --type result --from 2026-07-01 --limit 50
    quox aee get <envelopeId>          # single envelope, full payload

Each AOCL layer (ingress/identity/policy/context/execute/verify/assemble)
shows up as its own envelope in the query results for a run's correlation ID
— this is how you see *why* a step was allowed or blocked, not just what it
returned.

### 6. Cancel or resume a run
    quox run cancel <runId>
    quox run resume <runId>            # after a paused/HITL-gated step clears

### 7. Work with triggers
    quox trigger webhooks              # inbound webhook paths from active nodes
    quox trigger schedules             # cron schedules owned by quoxflow
    quox trigger workflow-activate <id>
    quox trigger workflow-deactivate <id>

### 8. Create and run an autonomous objective
    quox objective create "Audit all hosts for expired TLS certs" --input '{}'
    quox objective list
    quox objective get <id>            # tasks, checkpoints, DAG
    quox objective start <id>          # decomposes into tasks
    quox objective approve <id>        # approve the decomposed plan → execute

### 9. Run a QSKL skill (crystal) directly
    quox skills list --category infrastructure --edition stable
    quox skills show <id>
    quox skills run <id> --data '{"hostId": "docker01"}'
    quox skills run <id> --data '{}' --async   # fire-and-forget, returns an executionId

### 10. Crystallise a good workflow run into a reusable skill
    quox skills from-execution <workflowId>
    # idempotent — returns the existing skill if this workflow was already crystallised

### 11. Import an n8n export or an objective template
    quox workflow import-n8n -f export.json
    quox workflow import-objective --template <templateId>

### 12. Route an approval-gated step (HITL)
When a workflow node hits the approval-gate executor, the run pauses and a
HITL inbox item is created. Approve/deny from the inbox, then resume the run:

    quox inbox list --pending
    quox inbox respond <itemId> --action approve --comment "reviewed"
    quox run resume <runId>

## Gotchas

- **`workflow validate` validates the stored copy, not your local file** —
  `apply` first, or you're validating stale content.
- **A workflow must be published before `workflow run` will execute it** —
  running an unpublished ID fails with a clear error, not a silent no-op.
- **Expression engine has no `process.env` access, ever** — `env` is
  hard-coded `{}` for security. Don't write expressions that assume secrets
  or host env vars are reachable from inside a workflow node.
- **`skills run` takes the skill's `sourceWorkflowId`, not an arbitrary
  workflow ID** — use `skills show <id>` first if unsure which workflow
  backs a given skill.
- **Approval-gated runs pause, they don't fail** — a paused run shows up in
  `quox run get <runId>` with a paused status and a matching HITL inbox item;
  check `quox inbox list --pending` before assuming a run is stuck.
- **QSKL vs Quoxpert**: see the root `quoxpert` skill's "What Quoxpert is NOT"
  section for the full disambiguation.
