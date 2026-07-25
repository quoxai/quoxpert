---
name: quoxpert-quoxplan
description: "Make any Claude fluent at QuoxPlan, Quox's roadmap and stream planning
  suite. QuoxPlan has been the canonical Quox roadmap store since the 2026-07-25
  cutover (roadmap-cli is retired). Covers the quoxplan/quox plan CLIs, the TUI,
  the dashboard's Focus/Board/Timeline/Streams views, and the quoxplan_* agent
  tools ROADY uses. Load when the user wants to read or update a roadmap/stream,
  script roadmap changes, or wire an agent to roadmap data."
argument-hint: "<task, e.g. 'brief me on a stream', 'add a note', 'mark COMPLETE'>"
metadata:
  quoxpert:
    source_repo: quoxplan
    sources:
      - repo: quoxplan
        path: README.md
      - repo: quoxplan
        path: docs/CLI.md
      - repo: quoxplan
        path: docs/USER_GUIDE.md
      - repo: quox-dashboard
        path: services/collector/lib/quoxplanTools.js
      - repo: quox-plugin-sdk
        path: docs/suggested-rules.md
    generated_at: 2026-07-25
    quox_version: ">=0.1 pre-1.0"
---

# Quoxpert: QuoxPlan (Roadmaps)

## What this is

QuoxPlan is Quox's roadmap and stream planning suite, embedded in the QuoxCORE
dashboard under Developers (`/quoxplan`). It answers three questions fast: what
matters now, what's the full context of this stream, and what changed while I was
gone. Every capability is API-first, so a Claude session can brief on a stream or
mutate it with no local install, the same way the dashboard, the standalone CLI,
the `quox plan` CLI, and the TUI all do.

**QuoxPlan has been the canonical Quox roadmap store since the 2026-07-25
cutover** (owner order). Its `quox-strategic` roadmap is the live Quox strategic
roadmap, reads and writes. `roadmap-cli` (the old tool over
`~/STRATEGIC_ROADMAP.json`) is retired: every invocation prints a retirement
banner mapping each old verb to its `quoxplan` equivalent and exits 1.
`~/STRATEGIC_ROADMAP.json` is now a generated read-only mirror kept in sync a
few seconds after every mutation, never a source of truth. A fictitious
"Meridian Robotics" demo corpus (3 roadmaps, 63+ streams) lives in the same
database for onboarding and screenshots.

## When to use QuoxPlan

- The user wants to know what's in flight, blocked, or overdue on a roadmap.
- The user wants full context on one stream before working on it (phases, plan
  excerpt, notes, dependencies).
- The user wants to log progress, tick a phase, or flag a blocker on a stream.
- The user wants to script roadmap changes (bulk update, reprioritise, export).
- **Never hand-edit `~/STRATEGIC_ROADMAP.json` or any exported roadmap JSON.**
  It is a generated mirror; edits are silently overwritten on the next
  mutation. Always go through the CLI, the dashboard, ROADY, or the API.

## The CLIs

Two CLIs, built in verb-for-verb parity, both wrapping the same server API:

| | `quoxplan` (standalone) | `quox plan` (QuoxCORE parity) |
|---|---|---|
| Talks to | QuoxPlan server directly (`QUOXPLAN_URL`, default `http://localhost:3107`) | collector's governed proxy `/api/v1/quoxplan/*` |
| Auth | none | requires `quox login` |
| Writes witnessed (AEE/WARD)? | No | Yes, every 2xx mutating request |

Shared verb set: `roadmaps`, `list [roadmap] [--lens focus|tier|all]`, `focus
[roadmap]`, `show <id>`, `timeline [roadmap] [--weeks N]`, `status <id> <STATUS>
[--confirm-owner]`, `note <id> <text...>`, `phase <id> tick|untick <seq> | add
<title>`, `plan <id> [--edit] [--history]`, `move <roadmap> <id> <position>`.
Every command supports `--json` (standalone: a flag; parity: `--output json`).

Five roadmap-cli-retirement verbs exist **only** in the standalone `quoxplan`
CLI today, `quox plan` has no equivalents yet: `add <json>` (create a stream,
`id`/`name` required), `update <id> <field> <value>` (PATCHes most fields;
`notes` appends instead of overwriting, `priority` is refused, use `move`),
`rename <oldId> <newId>` (cascades to phases/plans/notes/action-items/events
and every other stream's `depends_on`), `stats [roadmap]`, `completed
[roadmap]`.

`quoxplan tui` is an interactive terminal UI (main / detail / timeline
screens), standalone-only, needs a TTY.

**`--confirm-owner`.** Any `status` change to `COMPLETE` is rejected `403`
without `confirm_owner: true`. Neither CLI sends it automatically; you must
pass `--confirm-owner` explicitly. There is no "just do it" shortcut, this
mirrors the dashboard's confirmation dialog.

## Agents (the quoxplan_* tools)

Since the 2026-07-25 cutover, `quoxplan_*` is the only live tool family for
roadmap work (the older `roadmap_list`/`roadmap_show`/`roadmap_stats` tools
still exist but now read the frozen, stale `STRATEGIC_ROADMAP.json` archive,
treat any answer from those as out of date). Three read-only tools:

- `quoxplan_roadmaps`, roadmaps with status-count breakdowns.
- `quoxplan_streams`, streams in one roadmap (`lens=focus|tier|all`).
- `quoxplan_stream_brief`, the orientation tool: header, phase progress,
  latest notes, plan excerpt, dependencies/dependents, recent events. Reach
  for this before answering any stream-specific question.

Four write tools:

- `quoxplan_add_note`, appends a note to a stream.
- `quoxplan_set_status`, sets status; refuses `COMPLETE` locally without even
  calling the server, agents cannot mark a stream done directly.
- `quoxplan_tick_phase`, ticks/unticks a phase by sequence number.
- `quoxplan_request_complete`, the HITL escape hatch for `COMPLETE`: files an
  owner-approval card in the Inbox instead of writing directly. The stream is
  marked `COMPLETE` only once the owner approves; denying it does nothing.

**Witnessing.** The four write tools route through the collector's own
`/api/v1/quoxplan/*` proxy (not a direct hop to the QuoxPlan server), which is
the boundary where AEE emission and WARD witnessing happen, so agent writes
are witnessed today, same as a `quox plan` CLI write or a dashboard edit. The
standalone `quoxplan` CLI (bare `:3107`) is the one path that is **not**
witnessed, see Gotchas below.

ROADY (the roadmap agent, a chat rail in the QuoxPlan header) is the live
consumer of this tool family inside the dashboard, addressed to `agent:
"roady"`, with a per-surface context prefix (current roadmap id, current
stream id if on a stream page).

## Dashboard + TUI

The dashboard embed lives under Developers → QuoxPlan (`/quoxplan`), four
views (Focus, Board, Timeline, Streams) plus a per-stream page. Edit mode is a
global toggle (inline editors, drag reprioritise, plan editor with preview,
dependency combobox). Org-scoped roadmaps support division/department scope
filters. Action items auto-emit on a stream entering `BLOCKED` or
`DECISION_NEEDED`, and auto-resolve on leaving either status.

## When NOT to use this sub-skill

- Operating Quox generally (agents, workflows, fleet) → `quoxpert-cli` /
  `quoxpert-mcp`.
- Searching or citing a codebase → `quoxpert-repobrain`.
- Building a `.quoxplugin` → `quoxpert-plugin-sdk`.

## Gotchas

- **COMPLETE is owner-gated, no exceptions.** The API rejects it without
  `confirm_owner: true`; agents route through `quoxplan_request_complete`
  (HITL), never around the gate.
- **Notes are append-only.** `update <id> notes <value>` on the standalone CLI
  appends a note (with a stderr warning) rather than overwriting, matching the
  server's append-only notes model. There is no "edit history" for notes.
- **Standalone `quoxplan` CLI writes are not AEE/WARD-witnessed.** It talks to
  the bare `:3107` server directly. If a write needs evidence for the real
  `quox-strategic` roadmap, use `quox plan`, the dashboard's Edit mode, or
  ROADY's tools, not the standalone CLI.
- **Never restore from the JSON mirror without the owner's word.** The importer
  (`npm run import:roadmap` in `server/`) wipes-and-reinserts `quox-strategic`
  from the frozen archive file. It refuses to run (exit 2) unless
  `QUOXPLAN_ARCHIVE_RESTORE=1` is set. It exists only for disaster recovery;
  running it unguarded once destroyed roughly 20 minutes of live edits.
- **Restart after a code or migration change.** The server runs as the
  `quoxplan` service in `quox-dashboard/docker-compose.yml` (container
  `quox-quoxplan`); restart with `docker compose restart quoxplan` (rebuild
  first if `server/src` changed). The SQLite database is bind-mounted from the
  host, not a named volume, so the host-side importer keeps working against
  the same file.
- **`quox plan` doesn't have the five parity verbs yet.** `add`, `update`,
  `rename`, `stats`, `completed` exist only in the standalone `quoxplan` CLI.
  Use `quoxplan` directly (or the raw API) for those until parity lands.

## Suggested rules

Ship these with the tool, or it doesn't get used. Paste into the consumer's own
`CLAUDE.md` or agent onboarding file:

    ### QuoxPlan
    - Roadmap reads and visuals go through QuoxPlan (dashboard `/quoxplan`,
      `quoxplan` or `quox plan` CLI, or the `quoxplan_*` agent tools). Never
      hand-edit `~/STRATEGIC_ROADMAP.json` or any exported roadmap JSON, it is
      a generated mirror and gets overwritten.
    - Never bypass the COMPLETE confirmation gate; it is owner-gated at the
      API. Use `--confirm-owner` (CLI) or `quoxplan_request_complete` (agent),
      never automate around it.
    - Notes are append-only. Don't try to "correct" a note, add a new one.
    - Agents orient on a stream via `quoxplan_stream_brief` (or `quoxplan show
      <id>`) before working on it, not from memory of an earlier state.
    - After bulk edits, refresh derived views (`quoxplan stats`, the Focus
      lens) before quoting numbers, the export/bulk report tells you what
      actually changed.

## Staying current

Facts here are versioned against a `quox_version`. QuoxPlan moved fast around
its 2026-07-25 cutover (roadmap-cli retirement, then a same-day fix routing
agent write tools through the governed proxy so they're witnessed). If a
recipe here disagrees with your live instance, trust the instance and file it
as a drift bug, do not guess around it. The engine lives in its own repo
(`quoxplan/`, server on `:3107`); the governance seam is the collector proxy
`/api/v1/quoxplan/*`.
