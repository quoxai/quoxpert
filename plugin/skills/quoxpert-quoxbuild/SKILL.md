---
name: quoxpert-quoxbuild
description: "Make any Claude fluent at QuoxBuild, Quox's governed per-dev-server
  build queue (DEVSUITE-BUILD). A host-side executor (quoxagent dev.build) runs
  pre-registered build targets through a serialised coalescing queue with a
  durable journal and post-deploy verify probes; the collector control plane
  signs every dispatch and mirrors witnessed receipts. Load when you want to
  build/deploy something ON a registered dev server, check whether a build is
  actually green, or read build history with receipts. NOT for builds on this
  control box itself: Terminal 9 / the local quox-build client own that and are
  a separate, owner-gated instance."
argument-hint: "<task, e.g. 'build dashboard on dev-131', 'is the last collector build verified', 'show build history'>"
metadata:
  quoxpert:
    source_repo: quoxagent
    stream: DEVSUITE-BUILD
license: LicenseRef-SkillRights-Reserved-1.0
---

# QuoxBuild

**Green means verified: image built, container running, endpoint answering, receipt witnessed.**

## What it is

Each registered dev server runs its own build executor inside quoxagent (the
`dev.build` capability, enabled by the signed capability profile). The
executor owns a host-local pre-registered target list
(`<dataDir>/build-targets.yaml`, default `~/.quoxagent/build-targets.yaml`),
a serialised queue with a 3s coalesce window (N requests for one target
inside the window become ONE build whose receipt lists all N requesters), a
durable journal (`build-journal.jsonl`, survives restarts; interrupted runs
are reported as `INTERRUPTED` receipts on boot, never silently lost), and
post-deploy verify probes (settle-then-probe: a deploy that exits 0 and then
dies inside the grace window reports `UNVERIFIED`, not ok).

The security line, non-negotiable: **a dispatch only ever NAMES a target.**
Commands live exclusively in the host-local config the enable flow
provisions. The docker socket is host-root; if the envelope could carry a
command, dev.build would be a remote root shell with a queue in front of it.

## Result vocabulary (same as Terminal 9's history)

`ok` (steps green AND all verify probes green) · `FAIL` (a step failed) ·
`UNVERIFIED` (deployed but the service did not answer after settle) ·
`INTERRUPTED` (executor died mid-run; surfaced by boot reconciliation).
Never call an `UNVERIFIED` build green.

## CLI recipes (the governed path — collector-signed, receipted)

```bash
quox build targets --host <hostId>          # what this host can build
quox build dashboard --host <hostId> --msg "what changed"   # dispatch (sugar)
quox build dispatch <target> --host <hostId> [--stream X --phase Y --msg "..."]
quox build status --host <hostId>           # ready/degraded, prereqs, building-now, last outcomes
quox build history [--host <hostname>] [--target t] [--result FAIL]  # durable receipts, newest first
quox build latest                           # latest receipt per target
```

- `--stream/--phase` default from `QUOX_STREAM`/`QUOX_PHASE`, same as the
  local spool client. The receipt's terminal label is derived server-side
  from YOUR authenticated identity; you cannot forge it.
- Dispatch returning 200 means QUEUED, not built. Follow with
  `quox build status` and read the receipt before claiming green.
- 404 = not a registered dev server. 409 = registered but its profile does
  not enable dev.build (re-enable: `quox dev enable <hostId> --capabilities
  dev.register,dev.build,...`). 422 = the agent refused (usually an
  unknown target or an unmet prerequisite like a missing workdir; the error
  says which). 502 = transport (Bastion/agent unreachable).

## Dashboard

Dev Servers hub → the host's `build` capability pill → the build panel:
readiness + prereq self-report, building-now, per-target Build buttons,
recent receipts. The panel mirrors the CLI (absorb-and-mirror law); it
never talks to an LLM.

## Sharp edges (each cost a real cycle on the first proof drive, 2026-08-16)

- **Never restart the host's quoxagent while `quox build status` shows a
  build in flight.** The build is the agent's child: the restart kills it
  and the run reports FAIL (exit 130) or INTERRUPTED. The first live proof
  run killed its own tasks build exactly this way.
- **After any collector outage, restart dev-server agents.** The agent
  fetches its trusted signing key once at boot with no retry; a collector
  blip at that moment leaves `signature verifier not configured` and every
  dev.* capability fail-closed-dead until a manual restart (tracked defect
  on DEVSUITE-DEVMODE). Symptom: dispatch answers 409 "enabled: none" for
  a host whose profile is fine on disk.
- **Control-plane calls are Bastion-bound: ~4-13s each.** Do not poll in
  tight loops.

## Honest limits (as of 2026-08-16, v1)

- **No live log tail and no stop/cancel verb yet**: the journal records
  step events host-side, but the control plane has no SSE tail or kill
  route. If a build hangs, it is visible as a stuck `building:` in status.
- **No in-flight receipt in history**: receipts land at terminal states
  (ok/FAIL/UNVERIFIED/INTERRUPTED); "building now" lives only in
  `quox build status`.
- **Kit delivery is real (since 2026-08-16 second pass)**: `quox dev
  enable` with a dev.build grant delivers a guarded starter
  `build-targets.yaml` (never overwrites an existing registry; result
  shows `kit.build_targets: written | already_present | write_failed`).
  A fresh dev server reports ready with 0 targets; registering real
  targets in the file is the operator's move, by design.
- **No HITL gate on dispatch** in v1: any authenticated org caller with
  reach to the collector can dispatch a registered target.
- **Terminal 9 on the control box is NOT this system**: it is the original
  bash daemon, owner-gated, spool-based, untouched by QuoxBuild v1. Do not
  point `quox build` at dev-01 expecting to drive T9.

## Leave it better than you found it

If a recipe here is stale against `quox build --help` or the live routes,
fix THIS file in the same session and note it on QuoxPlan `DEVSUITE-BUILD`.
