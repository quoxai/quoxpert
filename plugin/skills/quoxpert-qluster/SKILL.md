---
name: quoxpert-qluster
description: "STUB — Qluster (the planned fleet control plane for operating
  multiple of your OWN QuoxCORE installations from one pane of glass) has not
  shipped yet. This sub-skill exists only to route correctly and set honest
  expectations; there is no product, repo, or CLI surface to teach."
argument-hint: "<not applicable — Qluster has not shipped>"
metadata:
  quoxpert:
    source_repo: none (no repo exists yet)
    sources:
      - repo: quox-dashboard
        path: docs/STREAM_QLUSTER_MVP_PLAN.md
    generated_at: 2026-07-11
    quox_version: "n/a — pre-build, plan v3 DRAFT as of 2026-07-08"
    status: coming_soon
---

# Quoxpert — Qluster (coming soon)

## What this is

**Nothing is shipped yet.** This is a placeholder so the Quoxpert root skill
can route a "manage multiple Quox instances" question somewhere honest
instead of guessing or inventing commands.

Qluster is the planned **fleet control plane for a single operator's own
Quox boxes** — the "Proxmox for Quox" analogy: every QuoxCORE installation
you run (dev box, prod box, hosted client boxes, demo boxes) shows up as a
node in one datacenter-style view, with per-node health/version/metrics and,
in later phases, drift checks, remote backup pull, and governed cross-
instance delegation via a meta-agent (working name: CaptainQluster).

It is planned as its **own standalone repo/product**, not a quox-dashboard
plugin — so when it ships, it will very likely get its own `quoxpert-*`
sub-skill(s) beyond this stub, sourced from that repo directly.

## When (not) to use this sub-skill

Use this only to correctly tell a user "that doesn't exist yet" when they
ask about managing a fleet of *Quox installations* (not to be confused with
a fleet of *managed hosts* — see the bastion skill for that, which is
shipped and real today).

**Do NOT use this for:**
- Managing hosts/servers Quox administers via SSH (Proxmox boxes, docker
  hosts, etc.) — that's real today, see the bastion skill.
- Anything currently in the `quox` CLI — there is no `quox qluster` or
  equivalent command. Don't fabricate one.

## Install & connect

Not applicable — there is nothing to install. If a user wants this
capability today, the honest answer is: it's planned, not built; point them
at the plan doc if they want the design, and don't improvise a workaround
that pretends to be Qluster.

## Status
<!-- quoxpert:generated:start status -->
| Field | Value |
|---|---|
| Repo | none — planned as a standalone repo |
| CLI surface | none |
| Plan doc | `quox-dashboard/docs/STREAM_QLUSTER_MVP_PLAN.md` (v3, DRAFT, 2026-07-08) |
| Roadmap stream | `QLUSTER` |
<!-- quoxpert:generated:end status -->

## Gotchas

- **Do not confuse Qluster with QuoxBastion fleet management.** Bastion
  manages *hosts* Quox administers (SSH, tools, agents) and is shipped
  today (`quox fleet ...`, see the bastion skill). Qluster manages *whole
  Quox installations* as nodes — a different layer, entirely unbuilt.
- **Do not invent commands or endpoints for this.** If asked to "list my
  Qluster nodes" or similar, say plainly that Qluster hasn't shipped rather
  than guessing at a plausible-looking CLI surface.
- This stub will be replaced by real sub-skill(s) once Qluster's repo exists
  and has a genuine operator surface to teach — check back after that ships.
