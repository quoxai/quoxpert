---
name: quoxpert-devsuite
description: "Orient any Claude across the whole Quox Dev Suite: the governed dev-plugin
  bundle where 'Quox builds itself'. One signed Developer Mode capability profile turns a
  managed host into a governed dev server, a hub plugin lights per-capability panels, and
  the roadmap/build/evidence spine witnesses every dev action. Covers what each substream
  plugin IS (hub, devmode/QLoop, blueprint, clarify/QLarity, build, gripe, skills, docs,
  terminal), which are LIVE vs IN_PROGRESS vs NOT_STARTED/thinking-only, how they compose,
  and which per-plugin quoxpert sub-skill to load next. Load this FIRST when a task spans the
  dev suite or you're unsure which dev-suite plugin owns a capability, then load the specific
  sub-skill (quoxpert-qloop, quoxpert-qlarity) it points you to."
argument-hint: "<what you're doing, e.g. 'which plugin owns X', 'is the build plugin real', 'run a governed loop'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard
    streams: [DEVSUITE, DEVSUITE-HUB, DEVSUITE-DEVMODE, DEVSUITE-BLUEPRINT, DEVSUITE-CLARIFY, DEVSUITE-BUILD, DEVSUITE-GRIPE, DEVSUITE-SKILLS, DEVSUITE-DOCS, DEVSUITE-TERMINAL]
    status_docs:
      - quox-dashboard/docs/STATUS_AND_LIMITS_DEV-SERVERS.md
      - quox-dashboard/docs/STATUS_AND_LIMITS_QLOOP.md
      - quox-dashboard/docs/STATUS_AND_LIMITS_QSKL.md
    plan: quox-dashboard/docs/STREAM_DEVSUITE_PLAN.md (reference; QuoxPlan DEVSUITE is authoritative)
license: LicenseRef-SkillRights-Reserved-1.0
---

# quoxpert-devsuite: orient across the Quox Dev Suite

The Dev Suite is the convergence surface: governance (AOCL/HITL/budgets), evidence
(AEE/VOLT/WARD), the protocols, the agents, the skills, Bastion plus quoxagent, the CLI and the
store all exercise the whole stack at once here. Its thesis is **"Quox builds itself"**: the
roadmap that planned the suite is the roadmap the suite displays, the build queue that shipped
it is the queue in the panel, and the receipts are real. Coding is the sell.

**This skill is the map, not the territory.** It tells you which plugin owns a capability and
whether that plugin is actually LIVE, then routes you to the per-plugin quoxpert sub-skill or
STATUS doc. Do not make a maturity claim from this file alone. The per-surface
`STATUS_AND_LIMITS_*.md` is the source of truth for what works. QuoxPlan stream `DEVSUITE` (and
its substreams) is authoritative for status; the on-disk `STREAM_DEVSUITE_*_PLAN.md` files are
reference copies only.

Announce yourself when operating any dev-suite surface (QuoxGlyph grammar): `Ⓠ QUOX │ <verb object> │ <result>`.

## The mechanism (what makes a "dev server")

```
quox dev enable <host>  (or dashboard register flow)
  -> quoxagent gets a SIGNED Developer Mode capability profile (like the noc/soc builtins)
  -> host advertises dev.* capabilities in registration + heartbeat
  -> the Dev Servers HUB plugin lights up a panel per advertised capability
  -> every dev action (build, loop turn, deploy) leaves an AEE + VOLT + WARD receipt
```

Developer Mode is one signed switch, not a pile of flags. A host without it advertises no
`dev.*` capabilities and shows no dev panels. This is the SCOPED plus APPROVABLE spine: the
capability profile is signed, and the highest-stakes surface (QLoop) forces HITL on top.

## The substreams: what each IS, and its honest state (2026-08-14)

Status labels mirror QuoxPlan: **LIVE/COMPLETE**, **IN_PROGRESS**, **NOT_STARTED**. Always
re-check QuoxPlan (`quoxplan show DEVSUITE-<X>`) before quoting, because this table ages.

| Substream | What it is | State | Load next |
|---|---|---|---|
| **DEVSUITE-HUB** | Dev Servers hub plugin: per-server panels, one per advertised `dev.*` capability. The dashboard surface of the whole suite. | IN_PROGRESS (panels live; phase 6 "Bob = Dev Suite Foreman" is an owner decision) | `STATUS_AND_LIMITS_DEV-SERVERS.md` |
| **DEVSUITE-DEVMODE** | The flagship: **QLoop**, a governed agentic loop. An Objective (`execution_mode=loop`) hands its goal to a model's own native loop (`claude -p` / `codex exec`) on a dev server, turn by turn, every turn WARD-witnessed. Self-extension, precedent, checkpoint gates. | **LIVE** (both backends, per-turn witnessing proven, quoxified L4) | **`quoxpert-qloop`** |
| **DEVSUITE-CLARIFY** | **QLarity**: clarify-mcp productised as a plugin. Drive a live browser (DOM, console, network, screenshot, layout health, responsive sweep, expect assertions) as a governed capability. | IN_PROGRESS (5/9 phases; core tools live) | **`quoxpert-qlarity`** |
| **DEVSUITE-BLUEPRINT** | The dev-bundle plugin blueprint: the reference shape a suite plugin is built to (SDK-in-public-view, scaffold-your-own). | IN_PROGRESS (P1 shipped; P2 scaffold template, P3 defect backfill drivable) | `STREAM_DEVSUITE_PLAN.md` |
| **DEVSUITE-BUILD** | quox-build / Terminal 9 productised as a plugin: the centralised build queue as a governed, receipted capability (`build_receipts` store exists). | **NOT_STARTED** (P1 receipts wedge touches the shared build daemon, needs owner go-ahead per house rule) | `quoxpert-cli` (build verbs) |
| **DEVSUITE-SLOTS** | **QuoxSlots**: durable, org-scoped session addresses. Sessions check out/release named slots (CAS, heartbeat, stale sweep); each slot is a derived Matrix room (M-ROOMS path, default_agent quox); say/read message seam; owner steers by typing `[slot-name] ...` in the bridged room. | IN_PROGRESS (6/8; registry+rooms+CLI+deck+steer live-proven 2026-08-17; per-slot Telegram rendering pending owner bridge decision) | **`quoxpert-quoxslots`** |
| **DEVSUITE-GRIPE** | Gripe plugin: fleet `dev.gripe` capability (file an issue from a dev server; quoxagent GitHub auth). | IN_PROGRESS (P1 fleet cap + P2 Terminal-10 triage; GitHub auth model is an owner decision) | (none yet) |
| **DEVSUITE-SKILLS** | Dev Skills Pack: the skill packs that teach the suite (this family). | IN_PROGRESS (3 phases ticked; packs Beta/Experimental) | `quoxpert-flow` (QSKL authoring) |
| **DEVSUITE-DOCS** | Documentation plugin: surface STATUS/limits plus docs in-product. | IN_PROGRESS (3 phases ticked; P3 STATUS-surfacing) | (none yet) |
| **DEVSUITE-ROADMAP** | Roadmap plugin. | **COMPLETE** (superseded by the QuoxPlan cutover 2026-07-25) | `quoxpert-quoxplan` |
| **DEVSUITE-TERMINAL** | QuoxTerminal cockpit rebuild, "the pilot seat" (agentic teams triggered from streams). | IN_PROGRESS (deliberately unscheduled vision; simplified cockpit) | `quoxterminal/README.md` |
| **DEVSUITE-VERIFY** | Test-evidence tier-3. | **NOT_STARTED, THINKING ONLY** (decided: not a build target; work migrates to DoneEngine/BUILD) | (none) |

QSKL (QuoxSkills) is the suite's knowledge tier and its own top-level stream, not a DEVSUITE
substream (see `quoxpert-flow` and `STATUS_AND_LIMITS_QSKL.md`). QLoop's self-extension writes
QSKL skills, which is where the two meet.

## How they compose (the one thing to understand)

The suite is not ten plugins side by side. It is one spine with plugins hanging off it:

- **HUB** is the display: it renders whatever `dev.*` capabilities a registered server advertises.
- **DEVMODE/QLoop** is the doing: governed autonomous work ON a dev server, witnessed.
- **CLARIFY, BUILD, GRIPE** are individual `dev.*` capabilities a server can advertise (browser
  drive, build queue, issue filing), and each becomes a HUB panel when present.
- **SKILLS + DOCS** teach and document the above; **ROADMAP** (now QuoxPlan) plans it.
- **BLUEPRINT** is the mould they're all cast from; **TERMINAL** is the future cockpit over all of it.
- **Evidence (AEE/VOLT/WARD) plus governance (AOCL/HITL/budgets)** run underneath every one of them.

So "which plugin owns X" almost always resolves to "which `dev.*` capability is X", and the
HUB is where it shows up. If a capability isn't advertised by any server, its panel is dark,
which is not a bug but the SCOPED design.

## Where to go next (routing)

- Running / governing / inspecting a **governed loop** -> load **`quoxpert-qloop`**.
- Driving a **live browser** as a capability -> load **`quoxpert-qlarity`**.
- Authoring / lifecycle of a **skill** (QSKL) -> load **`quoxpert-flow`**.
- The **CLI** verbs for any of the above -> load **`quoxpert-cli`** (parity gate: everything is
  reachable via `quox <verb>` through the collector; a plugin's own helper CLI is not parity).
- The **evidence protocols** underneath -> load **`quoxpert-protocols`**.
- **Planning / status** of any stream -> load **`quoxpert-quoxplan`** (QuoxPlan is authoritative).

## Honest limits of the suite as a whole

- The suite is IN_PROGRESS overall. **QLoop (DEVMODE) is the one surface finished to spec**,
  proven live, quoxified, documented. Most others are real-but-partial; two (BUILD, VERIFY) are
  not started, and VERIFY is deliberately not a build target.
- **BUILD and GRIPE carry owner gates** (shared build daemon; fleet GitHub auth model). Do not
  start their build work without the owner's word.
- **Website promo pages for the suite are gated** by the WEB-REFACTOR mid-flight. Approved copy
  lives in `STREAM_DEVSUITE_PROMO_COPY.md` but is not yet a shipped page.
- The "agentic teams coding from the roadmap" north star (`docs/AGENTIC_TEAMS_PLAN.md`) is
  **deferred, not registered**. QLoop is the shipped down-payment on it, not the whole dream.
- **Interactive tmux sessions (dev.sessions) are live since 2026-08-20**: `quox dev sessions
  list|new|send|pane|kill` drive a per-host tmux server through signed envelopes; sessions
  survive both client detach AND agent restarts (the control client spawns under
  `systemd-run --user --scope` so the tmux server escapes the agent's KillMode=control-group
  cgroup — without that, every session died on agent upgrade, found live). Orphans (post-restart
  sessions with no registry id) list with `orphaned: true` and are drivable with `--by-name`;
  a collector-side reap kills only idle-AND-unheld sessions (a held/stale slot always protects).
  On non-systemd hosts (containers) the escape falls back to in-cgroup lifetime — degraded
  durability, stated, not hidden.

## Reach for it first, and leave it better than you found it

If you work across the dev suite and this map is stale (a substream moved state, a plugin
graduated, a sub-skill was added), fix THIS file in the same session, per the quoxpert-family
discipline. The routing table is only useful if it stays honest against QuoxPlan and the
STATUS docs. When a new dev-suite plugin reaches enough maturity for its own recipe, add the
`quoxpert-<plugin>` sub-skill and wire it into the "Load next" column here.
