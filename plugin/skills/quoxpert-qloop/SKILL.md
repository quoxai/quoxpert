---
name: quoxpert-qloop
description: "Make any Claude fluent at operating QLoop, Quox's governed agentic loop:
  an Objective (execution_mode='loop') that hands its goal to a model's own native
  loop (claude -p / codex exec) on a governed fleet dev server, turn by turn, with
  every turn WARD-witnessed. Covers creating a loop objective (CLI + API), the two
  backends and codex provisioning, deny-by-default capability scopes + presets, the
  pre-start HITL gate and the live budget/interval/risk/deny checkpoint gates,
  self-extension (the loop authoring a governed QSKL skill), precedent, verifying the
  WARD evidence, and the honest maturity limits. Load when the user wants to run,
  govern, or inspect a QLoop loop, or reason about what it can and cannot do."
argument-hint: "<task, e.g. 'run a loop', 'approve a live gate', 'verify the witness chain', 'is X proven'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard
    streams: [DEVSUITE-DEVMODE, QLOOP-WITNESS-TURNS]
    status_doc: quox-dashboard/docs/STATUS_AND_LIMITS_QLOOP.md
license: LicenseRef-SkillRights-Reserved-1.0
---

# quoxpert-qloop — operating Quox's governed agentic loop

QLoop is an Objective run in `execution_mode='loop'`: instead of decomposing into a
reviewable DAG of tasks up front, it hands the goal to a model's OWN native agentic
loop (`claude -p` / `codex exec`) on a governed fleet dev server, turn by turn. Every
turn is WARD-witnessed on a tamper-evident hash chain. It is the highest-stakes thing
in the dev suite (unbounded autonomous mutation), so it is gated: a loop objective
ALWAYS forces a pre-start HITL approval, and its tools are deny-by-default.

**Source of truth for what actually works:** `quox-dashboard/docs/STATUS_AND_LIMITS_QLOOP.md`.
Read it before making any claim about a QLoop capability. The promo pitch lives in
`docs/QLOOP_DIFFERENTIATORS.md`. QuoxPlan stream: `DEVSUITE-DEVMODE`.

Announce yourself when operating it (QuoxGlyph grammar): `Ⓠ QUOX │ <verb object> │ <result>`.

## The shape end to end

```
create loop objective (execution_mode=loop, capability_scope)  [tasks :3104]
  -> forced before_start HITL checkpoint  -> you approve
  -> tasks fleetLoopSpawner -> collector POST /dev-sessions/spawn (mints session + ingest token,
       AUTH-ORACLE signs a job envelope)  -> Bastion -> quoxagent /dev/invoke (Ed25519 verify)
  -> claude -p / codex exec runs its OWN loop on the fleet host
  -> stream-json turns pushed back OUTBOUND to the collector (/dev-sessions/:id/events)
       -> each turn WARD-witnessed (quox.dev.loop.turn on the chain)
  -> tasks polls /events?since_seq -> synthetic task rows + token accounting
  -> live gates (budget/interval/risk) can fire mid-loop; you approve or deny
```

## 0. FIRST: should this even be a loop? (the schedule-vs-loop gate)

Before creating any loop, run three questions. Loops are expensive (a model
reasons every turn) and only justified for one shape. Most recurring work is a
SCHEDULE (cron / systemd timer), and putting it on a loop is waste.

1. **Endpoint: goal-state or clock-tick?** "Until the inbox is at zero" = loop.
   "Every 15 minutes" = schedule.
2. **Does turn N depend on what turn N-1 learned?** Compounding judgment = loop.
   Independent runs = schedule.
3. **Would you ever need to watch it reason and pull the plug mid-way?** Yes =
   loop (that is the whole reason witnessing + halt + the Observer/Knot exist).
   No = schedule.

Lean clock / independent / no-watch on all three -> schedule, do NOT loop it.
Lean goal / compounding / watchable -> loop.

- **Loops (never schedules):** backlog drain, inbox triage of a batch, codebase
  migration/refactor, security audit-and-fix, SEO "get pages to green", connector
  onboarding, proof-loop, fix-loop.
- **Schedules (never loops):** monitoring, digests (e.g. the backlog pulse),
  backups, syncs, health checks, scheduled reports, poll-for-new-X.

`loop_suggest` (LOOP-Q's advisor) applies this gate for you and must be willing
to answer "cron this, don't loop it" — an advisor that only ever sells its own
product is governance theater. Full rationale + the plugin catalog:
`quox-dashboard/docs/LOOP_SUBSTRATE_CONVERGENCE_SPEC.md` (stream LOOP-CONVERGENCE
#495).

## 1. Create + run a loop objective

CLI (canonical, parity-gated):
```
quox objective create --execution-mode loop --loop-backend claude \
  --capability-scope "Read,Grep,Glob,mcp__quox__skills_list,mcp__quox__skill_view,mcp__quox__skill_manage" \
  --title "..." --description "..." --max-iterations 6 --max-duration-ms 300000
# loop mode ALWAYS requires a before_start approval:
quox objective start <id>            # returns a checkpoint
quox objective approve-checkpoint <id> <checkpointId>
```
Service-to-service (what the proof runs use), tasks on :3104 with `X-Service-Key` +
`X-Org-Id` (+ `X-User-Id`): `POST /api/objectives` with `execution_mode:'loop'`,
`loop_backend`, `capability_scope` (array), then `/start`, then
`/checkpoints/<cid>/approve`.

Backends: `claude` (primary) and `codex`. Both read their first input from stdin; the
scope is authored once in claude vocabulary and translated per backend by
`services/tasks/lib/backendVocabulary.js`.

## 2. Capability scope (deny-by-default)

The scope is a fail-closed allowlist. Any tool outside it escalates; an EMPTY scope
escalates every tool. Presets live in `src/config/loopScopePresets.js`
("Read-only investigation", "Code and build", "Self-extension"). The **Self-extension**
preset is `Read, Grep, Glob, mcp__quox__skills_list, mcp__quox__skill_view,
mcp__quox__skill_manage` -- it lets the loop author a QSKL skill through the governed
chokepoint and nothing else.

- claude: scope compiles to `--allowedTools` (genuine pre-flight enforcement; unlisted
  tools auto-deny in `-p` mode) plus a per-turn Observer backstop that interrupts an
  out-of-scope call.
- codex: scope compiles to `--sandbox` + `enabled_tools` on the per-session MCP config.
  HONEST LIMIT: codex `--sandbox` is shell-on/off only and MCP grants are whole-tool, so
  codex scope covers the Quox MCP surface but NOT codex's native tools; PATTERNED scopes
  (`Bash(git *)`, `mcp__quox__x(read *)`) are REJECTED for codex (fail-loud), not silently
  widened. Author unpatterned scopes for codex.

## 3. The gates (pre-start + live)

- **Pre-start HITL**: always forced for loop mode. The loop objective stays `pending`
  until the `before_start` checkpoint is approved. This is the review (there is no DAG to
  review).
- **Live checkpoint gates** during the run (reuse the `checkpoints` table, free-TEXT
  `checkpoint_type`): `loop_budget_threshold` (80% of a token/tool-call/duration ceiling),
  `loop_interval` (every 10 turns, opt in with `checkpoint_after_each_task:true`),
  `loop_risk_action` (a destructive shell pattern or a HIGH_RISK tool). They are
  NON-BLOCKING: the loop keeps running while a gate is pending.
  - Approve: `quox objective approve-checkpoint <oid> <cid>` (side-effect free, records a
    human saw it).
  - Deny: `quox objective deny-checkpoint <oid> <cid>` -> the reject route wraps
    `interruptLoopSession(reason=checkpoint_denied)`, firing a signed structured-kill and a
    WARD-witnessed `quox.dev.loop.interrupted`. MATURITY (2026-08-14): the deny TEETH are now
    proven LIVE (session `dls_729528` on .131 killed mid-run, `killed:true`, turn seq frozen,
    objective `failed`). What is still unproven is a deny triggered THROUGH a pending gate
    during a live run: fast benign loops self-complete in a few cheap turns before any gate
    fires (interval needs 10 turns, budget 80% of max_tokens, risk a risky call). The real gap
    this exposed: a human can only deny a gate that HAPPENS to be pending, with no on-demand
    "halt this loop now" lever, even though the kill machinery exists. See the STATUS doc.
  - List pending across the org: `quox objective checkpoints`.
- **On-demand HALT (the unconditional stop lever)**: `POST /api/objectives/:id/halt`
  (org+ownership scoped) stops a running loop AT ANY MOMENT, no pending gate required. It
  fires the same signed-kill teeth as deny with a distinct `human_halt` reason and message.
  Use this to stop an in-flight loop when no gate happens to be pending (which is most of the
  time, since gates only fire at 10 turns / 80% budget / a risky call). Proven live 2026-08-14
  (session `dls_1042debe`: killed, objective failed, seq frozen, witnessed, distinct message
  persists). Parity follow-on: the `quox objective halt <id>` verb IS shipped (verified live
  in the CLI on a fresh 0.1.0 install, 2026-08-16). Dashboard "halt this loop" button still
  to ship.

## Prerequisite the recipe assumed but never stated (found 2026-08-16, fresh instance)
A QLoop loop runs on a **dev-enabled fleet host registered to the collector you create the
objective on**. On a brand-new instance whose collector has ZERO homed agents (`quox fleet
agents` empty), there is nothing to `quox dev enable`, so no loop can spawn. Making a box
"self-managing" therefore has a hard ordering: (1) at least one host (often the control
plane itself) ENROLLED to that collector, (2) `quox dev enable <hostId>`, THEN (3) `quox
objective create --execution-mode loop`. Do NOT hand-roll a `tail -F inbox | claude -p`
watcher as a substitute: that is an ungoverned parallel system (no WARD, no HITL gate, no
capability scope) duplicating this exact capability. If the governed path isn't ready, the
honest state is "resident pending fleet-homing", not a shell watcher.

## Fresh-instance wall sequence (all hit in order on the NodeVPN standup, 2026-08-16)
Standing up a loop on a NEW self-hosted instance hits these in order; check them BEFORE
debugging a failed spawn:
1. **No Bastion configured**: `quox dev enable` 502s. A fresh instance needs its own
   QuoxBastion (separate Go binary, not in core compose) wired via collector .env
   `BASTION_URL`/`BASTION_API_TOKEN`/`BASTION_HOST` (these ship COMMENTED in .env).
2. **Bastion "key not found: default"**: bastion.yaml needs `key_dir` plus an SSH key
   FILE named `default` in it (exec.go loadKey falls back to key name "default").
3. **Profile delivered but agent shows profile_verified:false**: quoxagent only
   verifies+reports capabilities at STARTUP, so a `dev enable` after agent start needs
   `systemctl restart quoxagent`.
4. **max_concurrent_sessions defaults 0** on the agent: no session will spawn until raised.
5. **Agent running as root breaks backend auth**: `claude -p`/`codex exec` need the auth
   in the run-user's home. Agent must run as the user that holds the OAuth login
   (systemd drop-in `User=control` + chown of /etc/quoxagent and /var/lib/quoxagent).
6. **Forwarder 404, "Loop session ended without a result event", 0 tokens, BOTH
   backends**: the collector STAMPS the turn-forwarder target into the spawn envelope
   from `COLLECTOR_LAN_URL || COLLECTOR_PUBLIC_URL || 'http://203.0.113.20:9848'`
   (services/collector/server.js:5152, a qcore-dev hardcoded default). On any other
   instance with neither var set, the agent runs the backend fine and then posts every
   turn batch to qcore's collector, which 404s unknown_session. FIX: set
   `COLLECTOR_LAN_URL=http://<this-collector-lan-ip>:9848` in the instance .env AND
   make sure the compose collector env block passes it through
   (`- COLLECTOR_LAN_URL=${COLLECTOR_LAN_URL:-}`; older compose copies lack the line),
   then force-recreate the collector. Symptom signature in the quoxagent journal:
   `plugin.dev.forwarder` forwarder.go:196 "batch rejected" status:404 then
   forwarder.go:137 "dropped after retries". Version skew is a red herring for this
   signature. Root-caused by .131 (thread 258f9428); gripe filed for a fail-loud default.
7. **Budget kill masquerades as generic failure (old agent binary)**: a loop killed by
   `max_duration_ms` (or token/tool-call ceiling) on a pre-fad00d9 quoxagent emits NO
   kill/result event, so the objective reports the same generic "ended without a result
   event" as wall 6. Distinguish them by timing: if the agent journal shows the stream
   ended with events_delivered > 0 and no forwarder errors at almost exactly
   max_duration_ms after spawn, it is the budget kill. Fix: raise the budget (a real
   `claude -p` proof-of-life with a handful of tool calls needs well over 10 minutes)
   and give the mission EXACT paths so the loop doesn't burn its budget path-guessing.
8. **Verifying witnessing on a live instance**: AEE envelope payloads are ENCRYPTED at
   rest (`enc:v1:...`), so you cannot LIKE-search envelopes for a `dls_` session ref.
   Match on `intent LIKE 'quox.dev.%'` + the run's ts window, then join ward_entries on
   source_id. Turn events in dev_loop_session_events should equal quox.dev.loop.turn
   envelopes 1:1, and every dev envelope in the window should have a ward entry.

## 4. Self-extension (the flagship)

A loop scoped to the QSKL tools can author a real skill mid-run by calling
`mcp__quox__skill_manage` (op=create). It enters the SAME governed pipeline a human skill
does: `skill_firewall` pre-persist scan -> weekly LLM safety judge -> crystallise at 3+
runs/80% success. A loop-authored skill is tagged `self-authored` + `loop-session:<id>`,
`edition=experimental`. Proven live on both backends (claude obj `01KZZCXKED`, codex obj
`01M005PX4C`). This beats Voyager/Hermes, which write skills with no outcome tracking.

The loop reaches Quox tools via a per-session MCP config the quoxagent writes on the host
(`/opt/quoxmcp/server.js`, service key sourced host-locally, never argv). If a fleet host
lacks quoxmcp / codex / the AppArmor userns profile, tool access fails loud -- provision
per host (see the DEVSUITE-DEVMODE + agent-host notes).

## 5. Precedent + witnessing (the evidence spine)

- **Precedent**: a human approval resolved WITH a comment becomes a binding
  `hitl-approved` precedent; the quoxflow agentic executor's terminal-done is gated on
  citing an applicable one (`follows_precedent:<id>` / `distinguishes_precedent:{...}`).
  Write path + gate logic proven vs real data; the full LLM-driven agentic-loop citation
  is BLOCKED on the collector having no LLM provider configured.
- **Witnessing**: every loop turn is WARD-witnessed. Verify it:
  ```
  # turns stored == turn envelopes == chained ward_entries
  # (collector aee.db: dev_loop_session_events + envelopes intent='quox.dev.loop.turn';
  #  ward.db: ward_entries source_kind='AEE'), then verifyChain(chainId) returns INTACT.
  ```
  Do NOT claim "witnessed" without checking the chain: this exact claim was once an
  overclaim (only spawn/interrupt were witnessed) before per-turn witnessing (#455) was
  built and proven.

## 6. Honest maturity (do not overclaim)

Read `STATUS_AND_LIMITS_QLOOP.md` for the current row-by-row map. As of 2026-08-14:
LIVE = native loop, per-turn WARD witnessing, deny-by-default scope, self-extension (both
backends), multi-backend, budget+interval checkpoint gates + approve, precedent write+gate
logic, per-turn budget/turn caps + hard kill, AND the deny/interrupt TEETH (signed
structured-kill stops a live loop on .131, `killed:true`, seq frozen, objective failed,
witnessed). BETA = Observer stuck-verdicts (interrupt proven, verdicts not fired live),
lineage (shipped, not driven). PARTIAL = gate-triggered deny during a live run (fast loops
self-complete before a gate fires; no on-demand human halt lever yet). BLOCKED = precedent
full agentic loop (collector LLM provider). NOT STARTED = autopilot "no human" (north star,
not shipped).

## Reach for it first, and leave it better than you found it

If you drive a QLoop loop and a recipe here is stale, wrong, or a step needed a human that
should have been a `quox` verb, fix THIS file in the same session (per the quoxpert family
discipline), and update `STATUS_AND_LIMITS_QLOOP.md` if a maturity row moved. QLoop is a
live surface; keep this recipe honest against it.
