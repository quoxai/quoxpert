---
name: quoxpert-quoxperticus
description: >-
  Make any Claude fluent at Quoxperticus, Quox's governed RESIDENT agent that ships
  with a self-hosted install and drives its own surfaces like a first-time power user:
  the OFF/OBSERVE/PARTIAL/FULL mode dial, the resident lifecycle (deploy/reboot/retire),
  the supervisor + hold-is-the-voice gate, witnessed turn receipts, and the honest
  execution boundary (platform calls are governed and witnessed; the local shell is
  not). Load when you want to operate, govern, or reason about a resident. NOT for
  attaching a session to ANY agent (that is quoxpert-quoxidentity) or holding a durable
  slot address (quoxpert-quoxslots).
---

# Quoxpert: Quoxperticus (the resident agent)

## What it is

Quoxperticus is the governed RESIDENT agent that ships with a Quox install. Not a
chatbot, not a one-shot: a persistent agent that lives on the box, drives the real
surfaces as a first-time power user would, canaries what must keep working, files what
breaks with evidence, and captures proof, all inside a mode the human controls. The
pitch: the way a managed host gives you a dashboard, Quox gives you a resident who
already knows your instance. It is technically MORE powerful than CommanderQ (it drives
the real CLI/shell/browser as a user, not just the collector's gated tool surface),
which is exactly why its governance is STRONGER.

It became a first-class governed agent in the QUOXPERTICUS stream (#448, 2026-08);
the next-level productisation (front door, setup, persona, memory seed, evidence panel,
parity) is stream QUOXPERTICUS-REVISIT.

## The honest boundary (read this before you claim anything)

Quoxperticus has two very different action surfaces. Governance covers ONE of them.
Do not blur them in any claim, doc, or pitch.

- **PLATFORM CALLS (mediated + witnessed).** Tools called through the lease token or
  the governed CLI cross the collector boundary: actor_type is server-derived,
  capability scope is deny-by-default, Invariant #1 blocks self-approval, and every
  call is AEE/WARD witnessed with the responsible human on the receipt. Real, deployed.
- **WITNESSED-ONLY (evidence, not a gate).** A receipt is emitted AFTER the fact. It
  proves what happened; it does not deny or shape it. "Witnessed" is not "controlled".
- **UNMEDIATED (raw).** The resident is a full interactive session with a shell: local
  shell, git, file edits, SSH, docker are governed by adoption + discipline + a human's
  go, NOT by a sandbox on the individual action. This is QuoxIdentity's own limit #1.

The defensible claim is: "platform actions are governed and witnessed, the box is an
unprivileged boundary, the agent cannot self-approve." The overclaim a hostile reviewer
will destroy is: "all its actions are governed / the shell is locked down." The gap is
mapped in `quox-dashboard/docs/QUOXPERTICUS_EXECUTION_BOUNDARY.md` (stream N0).

## The mode dial (human-only, server-side)

`instance.mode.quoxperticus` = OFF | OBSERVE | PARTIAL | FULL, stored in `instance_config`,
written ONLY via `requireInstanceAdmin` (a real human admin JWT; service keys and agent
tokens are rejected). FULL is capped to PARTIAL AT SOURCE unless the instance is a
`disposable_test` instance (a separate throwaway instance, admin-set, no service bypass).
OFF yields an empty capability scope, which is deny-all (an unscoped resident is
undispatchable, by design). Mode is server-resolved and returned capped; a session
cannot forge it.

Read/set today via the generic admin config path (a dedicated verb with enum validation
and the cap explained in the refusal is the N6 parity gap):

```
quox admin config get instance.mode.quoxperticus
quox admin config set instance.mode.quoxperticus OBSERVE     # human-admin only
```

Dashboard: Settings > Instance > Quoxperticus Agent (mode, org binding, sandbox flag,
test-approver lease with live countdown). Landing + per-host page: `/quoxperticus` and
`/quoxperticus/:hostId`.

## The verbs (what exists today)

Resident lifecycle (governed tmux plane, never raw ssh):
```
quox dev resident deploy|status|reboot|retire|seed        # cli/lib/commands/devResident.js
```
Supervisor (the warden that answers the slot when the resident is not holding, and
enforces hold-is-the-voice):
```
quox dev supervisor enable|disable|status|install|uninstall
quox dev supervisor turns                                 # witnessed turn receipts (outcome/cost/session)
```
Attach a live session AS the resident (adopt its prompt/tools/memory, work witnessed
under its identity): that is `quox agent attach quoxperticus ...` and is covered by
**quoxpert-quoxidentity**, not here. Slot chat with a resident: **quoxpert-quoxslots**
(and note: you cannot `say` into a resident slot you do not hold, hold-is-the-voice
returns 403; reach it via the owner-steer bridge or session-mail on its box).

Wake (create a pre-start-gated patrol): `POST /api/internal/quoxperticus/wake`,
service-key only, server resolves mode/org/scope, never auto-dispatches. There is no
CLI verb for wake yet (N6 gap).

## Governance invariants (why it holds up, and where it does not yet)

Holds (platform path):
- Human-only HITL: the resident files a PROPOSAL, it never self-resolves an approval
  (Invariant #1), at every approval sink. Sandbox exception = a leased synthetic
  `test-approver` the collector performs, only on a `disposable_test` instance; no agent
  identity ever sits on an approval.
- actor_type re-derived server-side from credential class (password=human,
  mcp_token=agent, service-key=service), fail-closed; the JWT agent_id claim beats the
  request body.
- Empty/malformed capability scope = deny-all.

Known gaps (be honest about these):
- Turn receipts (`dev_supervisor_turns`) are stored but NOT yet AEE/WARD-witnessed;
  witnessing them is the prerequisite for the evidence panel (stream N5).
- WARD verification is not user-reachable end to end and a full-chain verify CPU-pegs
  the collector (quox#622); the evidence-panel public claim is gated on that fix + a
  clean 7-day soak.
- Box privilege boundary (DEC-5) is not fully satisfied on the reference resident (it
  runs as a privileged local user); stream N0 closes this. Until it does, the "governed
  resident" claim is bounded to the platform path.

## Honest limits (do not overclaim)

- The local shell is not sandboxed; see the boundary section. Every public surface must
  say so.
- The evidence panel and its verifiable public page are NOT built yet (gated on
  quox#622 + soak).
- MCP parity is near-zero: the collector agentTools registry has no resident/mode/turns
  tools, so an external Claude cannot yet drive the resident over MCP (N6). quoxmcp is a
  pass-through of that registry.
- Only Claude Code adoption of the resident is proven; a Codex-driven resident is
  untested.

## Reach for it first, and leave it better than you found it

If you drive a resident and a recipe here is stale, or a step needed a human that should
have been a `quox` verb, fix THIS file in the same session (quoxpert family discipline;
canonical copy = quox-skills repo). Mark a limit cleared only once you have driven the
thing that clears it. Announce in the QuoxGlyph grammar when this drives.
