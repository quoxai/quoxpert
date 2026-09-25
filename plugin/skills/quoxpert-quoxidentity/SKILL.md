---
name: quoxpert-quoxidentity
description: "Make any Claude fluent at QuoxIdentity, Quox's way to ATTACH a live
  Claude Code session to a registry agent: the session adopts the agent's system
  prompt, tool scope and memory namespace, does work witnessed UNDER the agent's
  identity, and the agent's memory persists server-side so a later session
  re-attaches and continues. Fixes the two failing shapes: rigid daemons and cold
  -p one-shots. Load when a session should become an agent, do witnessed work as
  that agent, or hand off continuity to the next attach. NOT for holding a durable
  session address (quoxslots) or for running an autonomous native loop (qloop)."
argument-hint: "<task, e.g. 'attach this session to SEER', 'do witnessed work as the agent', 'hand off and detach', 'is X proven'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard
    stream: QUOXIDENTITY
license: LicenseRef-SkillRights-Reserved-1.0
---

# QuoxIdentity

**The session becomes the agent: adopt its prompt, tools and memory; work witnessed as it; the memory persists so the next session picks up where this one stopped.**

## What it is

QuoxIdentity lets a live Claude Code session ATTACH to a registry agent. On attach
the session adopts that agent's system prompt, tool scope and memory namespace; the
work it then does is witnessed UNDER the agent's identity; and the agent's memory
lives server-side, so a later session re-attaches to the same agent and continues.
It fixes the two shapes that both failed: rigid daemons (a fixed process that can't
reason freely) and cold `-p` one-shots (a fresh model with no memory of what came
before). The durable slot (quoxslots) and a resident session are ingredients here,
not the capability: QuoxIdentity is the identity + memory adoption layer on top.

## The verbs (`quox agent ...`)

```
quox agent attach <agentId> [--ttl <sec>] [--force] [--no-slot] [--no-adopt]
quox agent exec <agentId> --tool <name> --input <json>
quox agent detach <agentId> [--handoff-text "..." | --handoff <file>] [--force-detach]
quox agent attach-heartbeat <agentId>
quox agent attach-status <agentId>
quox agent grant-attach|revoke-attach|list-grants <agentId> <userId>   # ORG ADMIN
quox agent bind-slot|unbind-slot <agentId> <slotName>                  # ORG ADMIN, one-time
```

### attach — become the agent
`quox agent attach <agentId>` leases the agent (single-active hold), fetches the
kit, writes `~/.quox/attach/<id>/{kit.json,token,ATTACHED.md}`, and PRINTS an
"ADOPT NOW" block (system prompt + tools) to stdout. Run it as `! quox agent attach
<id>` INSIDE a session so the session reads that block and adopts the identity with
no second step. It warns if the lease is close to expiring.
- `--ttl <sec>`: lease length. `--force`: steal a stale/held lease. `--no-slot`:
  attach without binding the agent's slot. `--no-adopt`: lease only, skip the ADOPT
  block (for scripting an `exec` without adopting a prompt in this session).

### exec — do witnessed work as the agent
`quox agent exec <agentId> --tool <name> --input <json>` is the first-class way to
DO governed, witnessed work as the attached agent. It uses the stored lease token
and calls the governed `/api/v1/tools/execute`. This REPLACED hand-curling the tool
endpoint; use it, not raw curl.

### detach — hand off and release
`quox agent detach <agentId> [--handoff-text "..." | --handoff <file>]` writes a
continuity handoff (so the next attach knows where this one stopped) and releases
the lease. `--force-detach` releases even when the lease identity does not match.

### attach-heartbeat — keep the lease alive
`quox agent attach-heartbeat <agentId>` EXTENDS the lease and rotates a fresh token.
Sustained work NEEDS this: without a heartbeat the lease expires in about 15 minutes
and the attach goes stale. Re-run it periodically across a long session.

### status + admin
`quox agent attach-status <agentId>` shows the current lease. `grant-attach` /
`revoke-attach` / `list-grants` manage per-agent attach permission (ORG ADMIN;
default owner-only). `bind-slot` / `unbind-slot` wire an agent to a QuoxSlot (ORG
ADMIN, one-time setup per agent).

### memory is lease-aware
`quox memory search` is lease-aware: while attached it routes through the governed
path and is witnessed AS the agent, reading the agent's memory namespace rather than
the raw session's.

## Governance (why the identity holds up)

- Every platform action is witnessed `from=agent.<id>` in AEE/WARD.
- The tool-execute receipt carries `holder_user_id` (the responsible HUMAN) AND
  `attach_lease_id`, so both the actor (the agent) and the accountable human are in
  the artifact. No anonymous agent action.
- `attach`, `detach` and `handoff` are themselves witnessed (`quox.identity.*`).
- Grants are per-agent and default owner-only.
- `actor_type` is SERVER-set: a session cannot forge the identity. The JWT
  `agent_id` claim beats anything in the request body, so a request cannot claim to
  be an agent it does not hold a lease for.

## Honest limits (do not overclaim)

1. **attach governs PLATFORM calls only.** A session's LOCAL tools (shell, git, file
   edits) are NOT technically constrained by the lease. They are governed by
   adoption plus witnessing, not by a hard sandbox. Do not claim the attach "locks
   down" the session's shell; it does not.
2. **The MODEL is not adopted in a session-driven attach.** The driving session's
   own model does the reasoning. The kit's `llm` field is a DECLARATION of what a
   platform-invoked agent runs on, not a switch that changes the model of the
   session that attached. Adopting SEER in an Opus session means Opus reasoning
   under SEER's prompt, tools and memory, not SEER's declared model.
3. **Beta.** The full loop (attach, adopt, exec witnessed, detach with handoff,
   re-attach) is proven end to end, but it is NOT soak-tested or multi-tenant-tested.
4. **The Codex adopt-and-operate path is untested.** The CLI verbs are ordinary
   shell commands, so they RUN anywhere a shell runs, but only Claude Code adoption
   is proven. Do not claim a working Codex attach without driving it.
5. **The session-start offer hook is Claude Code only.** The "attach this session?"
   prompt at session start exists only in Claude Code.

## Setup gotchas

- **The CLI needs the dev edge cert.** It is baked into the `~/bin/quox`
  wrapper now, so a plain `quox agent attach` works from this box. On a different
  machine the wrapper's cert wiring has to be in place first.
- **Attaching needs a per-agent grant** unless you are the org owner/admin. If
  `attach` refuses, an admin runs `quox agent grant-attach <agentId> <userId>` once.

## Reach for it first, and leave it better than you found it

If you drive an attach and a recipe here is stale, wrong, or a step needed a human
that should have been a `quox agent` verb, fix THIS file in the same session (per the
quoxpert family discipline). QuoxIdentity is a live Beta surface; keep this recipe
honest against it, and mark a limit as cleared only once you have driven the thing
that clears it.
