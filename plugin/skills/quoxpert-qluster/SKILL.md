---
name: quoxpert-qluster
description: "Operate Qluster, the standalone fleet control plane for your OWN QuoxCORE installations (one operator, many boxes, one governed console; 'Proxmox for Quox'). Load when the user wants to monitor a fleet of QuoxCORE boxes, connect/enroll a box, run cross-instance checks/drift, pull encrypted backups centrally, delegate a governed task to a box's agent, use Colonel Qluster, or read/verify QLOGS evidence."
argument-hint: "<what you want to do with the fleet, e.g. 'connect a box', 'delegate a task', 'read qlogs'>"
metadata:
  quoxpert:
    source_repo: quox-qluster
    sources:
      - repo: quox-qluster
        path: docs/STATUS_AND_LIMITS.md
      - repo: quox-qluster
        path: docs/STATUS_AND_LIMITS_QLOGS.md
    generated_at: 2026-07-25
    quox_version: ">=0.1 pre-1.0"
    qluster_phase: "5c (QLOGS complete)"
    status: stable
---

# Quoxpert: Qluster (fleet control plane)

## What this is

Qluster is a **standalone control plane for operating multiple of your OWN QuoxCORE
installations from one governed console**. The mental model is *Proxmox for Quox*: every
QuoxCORE box is a node in your cluster, and Qluster is the datacenter-style view + control
over the whole fleet. **One operator, many boxes, one pane of glass**, and every box keeps
its own governance, policy, and sovereignty.

It is its OWN repo (`quox-qluster`, github.com/quoxai/quox-qluster) and its OWN service: a
controller (Node/Express + better-sqlite3, an SSE event hub, single-operator session auth)
with a React glass UI, separate from any single QuoxCORE box. Default console: `:4200`.

## When (not) to use

Use this when the user wants to: monitor a **fleet** of QuoxCORE boxes, connect/enroll a new
box, run cross-instance checks/drift, pull encrypted backups centrally, delegate a governed
task to a box's agent, ask **Colonel Qluster** about the fleet, or read/verify **QLOGS**
evidence.

**Do NOT use for:**
- Operating a SINGLE QuoxCORE box (its agents/workflows/memory) → `quoxpert-core` / `quoxpert-cli`.
- SSH/governed-command ops against managed *hosts* → `quoxpert-bastion` (QuoxBastion is a
  different fleet layer: Linux hosts, not QuoxCORE installations). Qluster manages whole
  *Quox installations* as nodes; the bastion manages *hosts*.
- Anything hypervisor/VM: Qluster controls QuoxCORE *installations*, not virtual machines.

## Concepts

- **Box** = a QuoxCORE installation (a node in your fleet), registered with a `base_url`.
- **Controller** = the Qluster service (single trusted operator): the pane of glass.
- **Scopes** (per enrolled box): `node.read` (telemetry) · `backup.trigger`/`backup.download`
  (backups) · `agent.delegate` (governed tasking). Org-bound via `allowed_orgs`.
- **Sovereignty**: the controller never gets a back door. A delegated task runs under the
  BOX's own policy/HITL; the box can deny it, and Qluster records, never overrides, that.

## Surfaces

- **Web console** (`:4200`): the **Datacenter view** (boxes as full-width rows with live
  CPU/mem/disk gauges + a status), the **Status Wall** (NOC), per-box detail, the
  **Delegations** panel, **Colonel Qluster** chat, and **QLOGS** (the evidence surface).
- **REST API**: single-operator session auth (`POST /api/login`). Key routes:
  `GET/POST/PATCH/DELETE /api/boxes[/:id]` · `POST /api/boxes/:id/delegate` +
  `POST /api/delegations/:id/approve` · `POST /api/checks/run` ·
  `POST /api/boxes/:id/backups/pull` · `GET /api/qlogs*` · `POST /api/agent/chat` ·
  `GET /api/events` (SSE).
- **No CLI yet**: a `qluster` CLI is roadmapped (`QLUSTER-CLI`); today it's the console + REST.

## Recipes

### Connect a box (capability-tier wizard)
The console's "Connect a box" chains: add the box + read token → enroll (scoped) → optional
delegation readiness. Pick a tier: **Monitor** (health only) / **Full telemetry** (+read token
→ CPU/mem/disk) / **Backups** (+backup scopes) / **Let-Qluster-task-it** (+`agent.delegate`).
Each tier self-provisions what it can and states what still needs a box-side action (a read
token, a stable LLM key for that org).

### Monitor the fleet
The Datacenter view shows every box as a row with live gauges + a status. Note the
**reachable-vs-unreachable** semantics: a box that ANSWERS at all (even a 502) is UP →
`degraded`; only a network-dead box (refused/timeout/DNS) is `unreachable`. Non-critical
services (e.g. an optional tool a box happens to run) do NOT drag a box to `degraded`.

### Run cross-instance checks & drift
`POST /api/checks/run` (or the Fleet Checks panel) runs `version.drift`, `config.fingerprint`,
**remote WARD-verify** (recompute a box's hash-chain), and `backup.freshness` across the fleet.

### Delegate a governed task (ALWAYS-HITL)
`POST /api/boxes/:id/delegate {prompt, org_id}` creates a **pending** request and NEVER sends.
Approve it (`POST /api/delegations/:id/approve`) → signed + sent → the box runs it under ITS
OWN policy/HITL. **Honest outcomes:** `completed` (reply) · `denied_by_box` (a real box policy
verdict, sovereignty) · `box_exec_failed` (a box-side runtime/credential fault, e.g. a stale
LLM key, NOT a policy denial) · `pending_hitl` (the box queued it in its own inbox). A box can
also require approval for ALL delegated tasks via its own "require approval for delegated tasks"
toggle.

### Pull an encrypted backup
`POST /api/boxes/:id/backups/pull {org_id}` → trigger → wait (transient-tolerant) → stream
download → sha256-verify vs the box's manifest → AES-256-GCM encrypt at rest → stored.

### Ask Colonel Qluster (the fleet meta-agent)
`POST /api/agent/chat`: a **read-only** meta-agent that answers questions across the whole
fleet. Multi-provider, **OAuth-first**: uses your Claude subscription by default (no API tokens),
with a provider switcher (Anthropic API / OpenAI). It observes and reports; it does not mutate
the fleet. (Governed delegation is the write path, and it's HITL.)

### Read / verify QLOGS (the evidence surface)
`GET /api/qlogs?intent=&action=&corr=&box=&actor=&type=&layer=&priority=&since=&until=`: every
controller action and cross-box comm as an **AEE** envelope, carrying **AOCL** layer verdicts
(L1 identity / L3 policy / L7 dispatch / L8 outcome), bundled into **VOLT**, and witnessed on a
tamper-evident **WARD** hash-chain. `GET /api/qlogs/corr/:corr` = the cross-box causality
timeline; `GET /api/qlogs/ward` = live chain verification; `?format=ndjson|csv` = auditor export.

## Gotchas

- **Delegation is always-HITL and boxes keep sovereignty.** The controller never bypasses a
  box's policy. `denied_by_box` is the box exercising its own governance: respect it, don't
  retry around it. `box_exec_failed` is a box-side runtime/credential fault (NOT a denial): fix
  it on the box (usually a stale/missing LLM key for that org).
- **LAN-only posture today.** Single trusted operator; the controller is NOT hardened for public
  or multi-tenant exposure. A dedicated hardening stream is required first (see
  `quox-qluster/docs/STATUS_AND_LIMITS.md` + `SECURITY_AUDIT_HALFTIME.md`). QLOGS has no per-org
  scoping yet: any authenticated session sees every box's evidence.
- **QLOGS is content-free evidence.** WARD stores only hashes; VOLT only metadata; AEE payloads
  carry no secrets (a delegation reply is stored as `sha256`, never verbatim). A WARD **WARN** is
  "could not verify" (box unreachable / no read token); it is NOT "tampered" (that's a red FAIL).
- **No CLI yet.** `QLUSTER-CLI` is roadmapped; drive via the console or REST until then.
- **Colonel Qluster is read-only.** It observes and answers; it doesn't mutate the fleet.
