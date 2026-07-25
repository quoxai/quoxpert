---
name: quoxpert
description: "Makes any Claude an instant expert at operating Quox — the governed multi-agent platform. Routing index: load this first to discover which Quoxpert sub-skill matches your task (CLI, MCP tools, workflows, fleet, plugins, protocols, deploy), then load that sub-skill for the actual recipes. Quox as a Claude-extension."
argument-hint: "<area: core | cli | mcp | flow | bastion | plugin-sdk | protocols | deploy | qluster | convert | publish>"
quox_version: ">=0.1 pre-1.0"
user_invocable: true
---

# Quoxpert — the Quox expert, as a Claude skill

**Quoxpert flips the arrow.** Quox is normally the thing that gives *agents* capabilities. Quoxpert makes *Claude itself* an instant expert at driving Quox — its CLI, its 130+ MCP tools (regenerated 2026-07-25), its workflow engine, its agent fleet, its plugin SDK, and its governance protocols. Install it once and any Claude wields Quox like a samurai.

This root skill is a **routing index**. It tells you which sub-skill to load for a task. The sub-skills hold the focused, verified recipes — load only what you need so context stays lean.

## What Quox is (60-second orientation)

Quox (product name for the QuoxCORE platform) is a **governed multi-agent operations platform**: a fleet of specialist AI agents (37 in the core registry, orchestrated by CommanderQ) that run auditable workflows, execute tools, remember across sessions, pause for human approval (HITL), and emit tamper-evident evidence of everything they do. It ships as a Docker stack of services (auth, collector, quoxflow, memory, tasks, files, orchestrator) with a React dashboard, a first-class `quox` CLI/TUI, a QuoxMCP adapter, 40 installable plugins, and four open governance protocols (AEE / AOCL / VOLT / WARD). The differentiator: **every agent action is cryptographically provable**. (Plugin and tool counts regenerated 2026-07-25.)

## Which sub-skill do I load?

| You want to… | Load |
|---|---|
| Understand the platform, concepts, service topology, "where does X live" | `quoxpert-core` |
| Drive Quox from the terminal (`quox` CLI + TUI): agents, workflows, chat, HITL, fleet, vault, governance | `quoxpert-cli` |
| Wield Quox's tools from inside Claude via QuoxMCP (install + the 130+ RBAC-gated tools) | `quoxpert-mcp` |
| Build, run, or inspect workflows (quoxflow: nodes, AOCL pipeline, triggers, objectives, skills) | `quoxpert-flow` |
| Operate the agent fleet + governed SSH execution (QuoxBastion + quoxagent) | `quoxpert-bastion` |
| Build a `.quoxplugin` extension (the plugin SDK, plugin backends, publishing) | `quoxpert-plugin-sdk` |
| Read/verify governance evidence (AEE envelopes, AOCL layers, VOLT bundles, WARD chains) | `quoxpert-protocols` |
| Install / upgrade / back up / configure a Quox instance | `quoxpert-deploy` |
| Multi-instance fleet control across quox-boxes (monitor, enroll, checks, backups, governed delegation, QLOGS) | `quoxpert-qluster` |
| Turn an existing tool (MCP server, dashboard, chat-ops bot, script, agent) into a Quox plugin | `quoxpert-convert` |
| Understand what's shippable today for distributing/monetising a plugin (signing, licensing, what's not live yet) | `quoxpert-publish` |

When in doubt, start with `quoxpert-core` for orientation, then narrow.

## Install & connect (never paste a secret in chat)

**Install Quoxpert** (two ways):
- **Claude Code marketplace:** `/plugin marketplace add quoxai/quoxpert` then enable the `quoxpert` plugin.
- **Curl:** `curl -sSL https://quox.ai/quoxpert/install.sh | bash` (copies the sub-skills into `~/.claude/skills/`).

**Connect to a Quox instance** — the sub-skills teach *where* your credentials live (the instance's `.env` `INTERNAL_SERVICE_KEY`, your `quox login` session, your MCP token) and how to point Claude at them. **Quoxpert never asks you to paste a secret into the conversation** — it tells you the file/env/command, you wire it yourself. See `quoxpert-cli` (login) and `quoxpert-mcp` (MCP connect).

## What Quoxpert is NOT

- **NOT QSKL** — QSKL / Crystals are Quox's *internal* procedural-knowledge system for its *own* agents. Quoxpert is for *your* Claude, about operating Quox.
- **NOT QuoxNucleus / repobrain** — that's a codebase-intelligence engine. Quoxpert *uses* it as a source for staying current, but it is not the skill.
- **NOT the `.claude/skills/*` dev slash-skills** — those are for engineers working *on* the Quox codebase. Quoxpert is for *operating* Quox.
- **NOT QUOX-DEEP** — that's UI-recording recipes for making demo videos.

## Staying current (the moat)

Each sub-skill mixes **generated blocks** (auto-refreshed from the Quox codebase — `CODEBASE_MAP.md`, concept docs, `quox --help`, the live tool list) with **hand-authored recipes** (verified transcripts). A drift-check CI fails when a Quox surface changes but its sub-skill wasn't updated, so Quoxpert can't silently rot. If a recipe here disagrees with your live instance, trust the instance and report it — the skill is versioned against a `quox_version`, and a mismatch is a bug to file, not to guess around.
