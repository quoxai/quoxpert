---
name: quoxpert-protocols
description: "The four Quox governance protocol specs, taught as one combined
  skill: AEE (Agent Envelope Exchange — message causality), AOCL (Agent
  Orchestration Control Layers — OSI-style control/audit stack), VOLT
  (Verifiable Operations Ledger & Trace — evidence bundles), WARD (Write-once
  Append-only Receipt Digests — tamper-evident hash-chain witnessing). Load
  when the user asks about Quox's compliance/audit/evidence story, wants to
  read or verify a WARD chain, inspect an AEE envelope, or understand an AOCL
  layer trace."
argument-hint: "<protocol or task, e.g. 'verify a WARD chain' or 'trace envelope <id>'>"
metadata:
  quoxpert:
    source_repo: aee, aocl, volt, ward
    sources:
      - repo: aee
        path: README.md
      - repo: aocl
        path: README.md
      - repo: volt
        path: README.md
      - repo: ward
        path: README.md
      - repo: ward
        path: CHAIN_STRUCTURE.md
      - repo: quox-dashboard
        path: docs/AOCL.md
      - repo: quox-dashboard
        cmd: "node cli/bin/quox.js governance --help / aee --help / volt --help / trace --help"
    generated_at: 2026-07-11
    quox_version: v4.2.0
---

# QuoxPert — Governance Protocols (AEE + AOCL + VOLT + WARD)

## What this is

Four independently-useful, complementary specs that together make Quox's
agent operations **observable, controllable, provable, and witnessed**. Each
has its own repo (`quoxai/aee`, `quoxai/aocl`, `quoxai/volt`, `quoxai/ward`),
each ships an IETF Internet-Draft, and none of them is a runtime — they
standardize structure and audit trail, not execution.

```
User Request
    |
    v
AEE   (message envelopes: who asked, what they want, how replies connect)
    |
    v
AOCL  (orchestration control layers: routing, policy gates, HITL, delegation)
    |
    v
Tools / Runtimes / Files / Network   (the actual work happens here)
    |
    v
VOLT  (evidence ledger: tamper-evident event chain + portable bundles)
    |
    v
WARD  (content-free witnessing: hash-chain receipts over AEE/AOCL/VOLT events)
```

This is Quox's **compliance and evidence differentiator** — the answer to "who
approved that," "what tool ran with what inputs," "can you prove the log wasn't
edited after the fact," and "can an external auditor verify this independently
without trusting our database."

## When (not) to use this sub-skill

**Use it when:** the user asks what AEE/AOCL/VOLT/WARD are, wants to
read/verify a WARD chain, inspect an AEE envelope or its causality chain,
understand an AOCL layer trace, pull VOLT evidence for a run, or needs the
governance/compliance pitch.

**Don't use it for:**
- Actually calling the MCP tools that surface this data from chat
  (`query_envelopes`, `get_envelope_chain`, `list_evidence`) → `quoxpert-mcp`
  (that skill teaches the *how to call*; this one teaches *what comes back*).
- Scripted/CI use of the `quox aee`/`quox governance`/`quox volt`/`quox trace`
  CLI commands as part of a larger automation → `quoxpert-cli`.
- **QSKL/Crystals** (Quox's *internal* skill/crystal system, run by Quox's own
  agents under governance) — a different system entirely, not a protocol spec.
  Don't confuse "Quox has skills" with this skill or with AEE/AOCL/VOLT/WARD.

## Install & connect

There's nothing to "install" — these are specs, not services. Claude reaches
governance data two ways on an existing QuoxCORE instance:

1. **Via QuoxMCP tools** (chat-native, no shell) — `query_envelopes`,
   `get_envelope_chain`, `list_evidence`. See `quoxpert-mcp` recipe 9.
2. **Via the `quox` CLI** (scripted/terminal) — four command groups exist:
   `quox aee` (envelope store/query), `quox governance` (policies, WARD chain,
   VOLT evidence/certification), `quox volt` (offline bundle verify/inspect),
   `quox trace` (assembled AOCL layer traces + replay/simulation). All require
   `quox login` first — live-verified: an unauthenticated `quox status`
   against the collector returns `401`.

## The four protocols
<!-- quoxpert:generated:start protocol-table -->
| Protocol | Full name | Role | Status | Repo |
|---|---|---|---|---|
| **AEE** | Agent Envelope Exchange | Message format + causality (`corr`/`reply_to`) | Experimental v1 (`draft-cowles-aee-00`) | `quoxai/aee` |
| **AOCL** | Agent Orchestration Control Layers | OSI-style control/audit pipeline (L0–L10) | Experimental v0.1 (`draft-cowles-aocl-00`) | `quoxai/aocl` |
| **VOLT** | Verifiable Operations Ledger & Trace | Tamper-evident evidence ledger + portable bundles | Draft v0.1 (`draft-cowles-volt-00`) | `quoxai/volt` |
| **WARD** | Write-once Append-only Receipt Digests | Content-free hash-chain witnessing | Draft v0.1 | `quoxai/ward` |

`quox` CLI surface (live-verified via `--help`, all under top-level `quox`):

| Command group | Subcommands |
|---|---|
| `quox aee` | `store`, `get <id>`, `query`, `conversations`, `stats` |
| `quox governance` | `policy`, `template`, `approval`, `ward`, `evidence`, `traces`, `certify <runId>`, `cert` |
| `quox governance ward` | `status`, `chains`, `entries`, `verify` |
| `quox governance cert` | `get <certId>`, `for-run <runId>`, `list`, `stats` |
| `quox volt` | `verify <file>`, `inspect <file>`, `export <file>`, `summary <file>` |
| `quox trace` | `list`, `get <identifier>`, `simulate <identifier>`, `compare`, `replay`, `comparison`, `correlation` |
<!-- quoxpert:generated:end protocol-table -->

### AEE — Agent Envelope Exchange

A 14-field JSON envelope carrying identity (`from`/`to`), intent (`intent`),
causality (`corr`/`reply_to`), tracing (`trace`), constraints (`requires`), and
payload. `type` is the fixed envelope category (`task`/`result`/`event`/
`error`/`stream`); `intent` is the open, dotted payload meaning (e.g.
`ops.backup.status.check`, `aocl.layer.complete`). Every hop in a chain shares
one `corr`; each response's `reply_to` points at the envelope that triggered it
— that's the whole causality model. AEE is explicitly **not** orchestration,
**not** a runtime, and **not** a framework — "just structure," 14 fields.

```json
// task
{"v":"1","id":"01EXAMPLE_TASK...","type":"task","from":"human.adam",
 "to":"agent.router","intent":"demo.hello.world",
 "corr":"01EXAMPLE_CORR...","reply_to":null,"payload":{"message":"..."}}
// result — same corr, reply_to points back at the task's id
{"v":"1","id":"01EXAMPLE_RESULT...","type":"result","from":"agent.router",
 "to":"human.adam","intent":"demo.hello.world",
 "corr":"01EXAMPLE_CORR...","reply_to":"01EXAMPLE_TASK...","payload":{"ok":true}}
```
(from `aee/README.md`, the repo's own worked mini-example — verbatim)

### AOCL — Agent Orchestration Control Layers

An OSI-style pipeline an orchestrator runs every incoming event through:
`L0 Ingress → L1 Identity → L2 Route → L3 Policy → L4 Plan → L5 Context →
L6 Shape → L7 Delegate → L8 Verify → L9 Assemble → L10 Audit`. Each layer emits
`aocl.layer.{start|complete|bypass|reject}` as an **AEE `event` envelope** —
AOCL makes its control flow auditable by piggy-backing on AEE, no protocol
change needed. In QuoxCORE's actual dispatch path (per `docs/AOCL.md`), layer
maturity varies: L1 Identity, L3 Policy, L6 Shape are production-stable
standalone modules; L4 Plan is beta (rule-based single_turn/multi_step
classifier, HITL-gated objective delegation); some layers (L8 Verify) have
both a production implementation (`services/collector/lib/l8VerifyCheck.js`)
and a separate frontend-only reference implementation used for visualization —
don't confuse the two when reading source.

```javascript
// L2 layer-complete event (from docs/AOCL.md, real event shape)
{ intent: 'aocl.layer.complete',
  payload: { layer: 'L2', status: 'complete', handled: true,
             pattern: 'fleet_status', confidence: 1.0, duration_ms: 12 } }
```

### VOLT — Verifiable Operations Ledger & Trace

The evidence layer: a cryptographically **chained event log** (each event
hashed and linked to the previous) plus a **portable Evidence Bundle**
(`manifest.json` + `events.ndjson` + optional `attachments/`) plus an
**independent verifier**. VOLT explicitly does not decide policy (that's
AOCL), doesn't replace AEE messaging, and doesn't store secrets by default —
"privacy by default: log metadata + references." No blockchain required;
bundle hashes can optionally be anchored externally later. Event types include
message in/out, policy allow/deny, tool call requested/executed, human
approval granted/denied, file/network access (metadata only), model response
produced.

### WARD — Write-once Append-only Receipt Digests

The witnessing layer: a **separate, content-free hash chain** that observes
AEE/AOCL/VOLT events and proves they existed at a point in time, without
storing a single byte of their content — each entry records only source kind
(`AEE`/`AOCL`/`VOLT`/`WARD`/`EXTERNAL`), source ID, and a SHA-256 payload hash,
chained via `chain_hash = hash(prev_chain_hash | ...)`. Chains are scoped
`ward:org/<org>/env/<env>` (or `ward:meta/<deployment>` for chain-of-chains).
Periodic **tips** checkpoint chain state and can be Ed25519-signed and
published to external sinks (Gitea signed tags, S3 Object Lock) for
independent, out-of-band anchoring. WARD guarantees tamper-*evidence*, not
truth if the issuer itself is compromised — it's the notary stamp, not an
oracle.

```sql
-- ward/CHAIN_STRUCTURE.md, real schema
CREATE TABLE ward_entries (
    ward_entry_id TEXT PRIMARY KEY, chain_id TEXT NOT NULL, seq INTEGER NOT NULL,
    source_kind TEXT CHECK (source_kind IN ('AEE','AOCL','VOLT','WARD','EXTERNAL')),
    source_id TEXT NOT NULL, payload_hash TEXT NOT NULL,
    prev_chain_hash TEXT NOT NULL, chain_hash TEXT NOT NULL, sig TEXT,
    UNIQUE(chain_id, seq), UNIQUE(chain_id, source_kind, source_id)
);
```

### How they compose

- AEE envelopes carry `corr`/`reply_to` — AOCL uses these for layer-level
  audit, VOLT uses `corr` as its evidence `correlation_id`.
- AOCL emits `aocl.*` intents *as* AEE envelopes (no AEE spec change).
- Every AOCL policy decision (`allow`/`deny`/`hitl_required`) becomes a VOLT
  evidence event tagged with `context.aocl_policy_id`/`aocl_decision_id`.
- VOLT's hash-chained ledger proves an approval sequence ("HITL required →
  approved → tool executed") wasn't edited after the fact.
- WARD witnesses AEE envelopes, AOCL decisions, and VOLT bundles by ID +
  payload hash — a WARD failure never affects AEE transport or VOLT recording;
  it's a read-only, best-effort external witness layer.

## Recipes (hand-authored, the actual expertise)

### 1. Get a single AEE envelope
```bash
quox aee get <envelope-id>
```
Returns the full 14-field envelope. Use when a user hands you an ID from a
log or another tool's output and asks "what was this."

### 2. Query envelopes by correlation/time/type
```bash
quox aee query --type task --limit 20
quox aee query --from 2026-07-01 --to 2026-07-10
```
`--limit` defaults to 50. For a specific conversation thread, filter by `corr`
via the MCP `query_envelopes` tool's `corr` argument (the CLI's `aee query`
doesn't expose `--corr` directly — use `aee conversations` or the MCP tool for
that).

### 3. Trace an envelope's causality chain
Via chat: ask Claude to "trace envelope `<id>`'s chain" — invokes the MCP tool
`get_envelope_chain`, which walks `reply_to` links both directions to show
everything that led to and followed from a given envelope. This is the fastest
way to answer "what caused this" without manually chasing `reply_to` by hand.

### 4. Inspect an AOCL layer trace
```bash
quox trace get <identifier>
```
Assembles a narrative + per-layer waterfall (L0–L10) for one conversation/run
— the CLI equivalent of the dashboard's AOCL waterfall visualization. Use
`quox trace list` first to find an identifier, `quox trace simulate <id>` to
run a what-if policy change against a captured trace, and `quox trace compare`
for layer-aligned diffs between two runs.

### 5. Check WARD chain status
```bash
quox governance ward status
```
Shows chain + witness statistics (entry counts, latest tip) for the org's
default chain. `quox governance ward chains` lists all chains (e.g. separate
`prod`/`staging` scopes); `quox governance ward entries` lists individual
witness entries in a chain.

### 6. Verify WARD chain integrity
```bash
quox governance ward verify
```
Recomputes `chain_hash` for every entry from `genesis_hash` forward and
confirms no entry was modified, deleted, or inserted — the CLI-native
equivalent of the manual verification walkthrough in
`ward/WORKED_EXAMPLES.md` (genesis check → per-entry hash recompute →
prev-hash linkage check, entry by entry).

### 7. Query VOLT evidence for a run
```bash
quox governance evidence --corr <correlation-id>
quox governance evidence --workflow <workflow-id> --limit 20
```
Filters by `--corr`, `--envelope`, `--workflow`, `--execution`, or `--type`.
This is the CLI path into the same evidence VOLT records; from chat, the
equivalent is the MCP `list_evidence` tool (`workflow_id`/`execution_id`
filters only — narrower than the CLI's evidence query).

### 8. Verify a downloaded VOLT evidence bundle offline
```bash
quox volt verify <bundle.json|events.ndjson> [--strict]
```
Runs VOLT's independent verifier against an exported bundle — checks event
hashes, chain integrity, and (if present) attachment hash matches and
signatures. `--strict` also fails on warnings, not just hard failures. Use
this for bundles handed to an external auditor — verification doesn't require
network access to the originating collector.

### 9. Inspect events inside a bundle
```bash
quox volt inspect <bundle.json> --events        # list every event
quox volt inspect <bundle.json> --event 12       # show one event by sequence
quox volt inspect <bundle.json> --manifest       # manifest only, no events
```
Use `--manifest` first for a quick "what run is this, how many events, what's
in `attachments/`" before dumping the full event list.

### 10. Certify a run (write operation — flag this to the user)
```bash
quox governance certify <runId>
```
**This creates a certification record — it's a write, not a read.** Say so
explicitly before running it on the user's behalf; don't chain it silently
after an `evidence`/`trace` query. Inspect existing certifications first with
`quox governance cert list` / `quox governance cert for-run <runId>` /
`quox governance cert stats` before deciding a new one is needed.

### 11. Walk the full governance story for an audit request
When a user asks "prove what happened during `<incident/run>`":
1. `quox aee query`/`get_envelope_chain` — what messages were exchanged, in
   what order.
2. `quox trace get <identifier>` — which AOCL layers ran, what each decided.
3. `quox governance evidence --corr <id>` — the VOLT evidence trail for that
   correlation ID.
4. `quox governance ward verify` — confirm the WARD chain covering that time
   window is intact (i.e. nothing in steps 1–3 was silently rewritten after
   the fact).
This four-step order mirrors the protocol stack itself (AEE → AOCL → VOLT →
WARD) and is the strongest answer to "how do I know this wasn't tampered with."

### 12. Read the raw AOCL layer-event schema
Every AOCL layer event is itself an AEE `event` envelope with
`from: "system.aocl"`, `to: "audit"`, `intent: "aocl.layer.{start|complete|bypass|reject}"`,
and a `payload.layer` field naming `L0`–`L10`. If a user wants to parse these
programmatically (outside the CLI/MCP tools), this schema — not a bespoke
AOCL-only format — is what to expect on the wire.

## Gotchas

- **None of the four is a runtime.** AEE doesn't schedule or retry; AOCL
  doesn't execute tools; VOLT doesn't decide policy; WARD doesn't store
  content. Each standardizes structure/audit, not execution — don't describe
  any of them as "the thing that runs the agent."
- **`quox governance certify` mutates state.** It's the one write command in
  this whole recipe set — always name it as a write before running it.
- **All `quox aee`/`quox governance`/`quox volt`/`quox trace` commands need
  `quox login` first.** Live-verified: unauthenticated calls against the
  collector return `401`.
- **WARD stores zero bytes of content by design.** If a user expects to
  recover a payload from a WARD entry, redirect them to VOLT (which stores the
  actual event data) — WARD only proves the VOLT/AEE/AOCL event *existed*,
  it can't reproduce what it said.
- **AOCL layer maturity is uneven, and some layers have two implementations.**
  Per `quox-dashboard/docs/AOCL.md`, several layers (e.g. L8 Verify) have a
  production module under `services/collector/lib/` and a separate
  frontend-only reference implementation used purely for visualization — don't
  assume the frontend source is what actually gates a request.
- **Don't conflate this skill with QSKL/Crystals.** QSKL is Quox's own
  internal skill/crystal system for its agents (SENTINEL, NOVA, etc.),
  managed via `quox skills list` — a completely different system from these
  four governance specs. If a user says "Quox skill" meaning a Crystal, this
  skill is the wrong one to reach for.
- **RFC-3161-style external timestamping is not yet a shipped WARD mechanism**
  — WARD's v0.1 spec documents Ed25519 tip signing and publication to external
  sinks (Gitea signed tags, S3 Object Lock); broader "efficient anchoring to
  external notaries/chains" is listed as roadmap, not a specific standard
  committed in the current spec. Don't promise RFC-3161 timestamps as a
  current feature.
