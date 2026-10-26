---
name: quoxpert
description: "Makes any Claude an instant expert at operating Quox, the governed multi-agent platform. Routing index: load this first to discover which Quoxpert sub-skill matches your task (CLI, MCP tools, workflows, fleet, plugins, protocols, deploy), then load that sub-skill for the actual recipes. Quox as a Claude-extension."
argument-hint: "<area: core | cli | mcp | flow | bastion | plugin-sdk | protocols | deploy | qluster | convert | publish | repobrain | quoxplan>"
quox_version: ">=0.1 pre-1.0"
user_invocable: true
license: LicenseRef-SkillRights-Reserved-1.0
---

# Quoxpert: the Quox expert, as a Claude skill

**Quoxpert flips the arrow.** Quox is normally the thing that gives *agents* capabilities. Quoxpert makes *Claude itself* an instant expert at driving Quox: its CLI, its 130+ MCP tools (regenerated 2026-07-25), its workflow engine, its agent fleet, its plugin SDK, and its governance protocols. Install it once and any Claude wields Quox like a samurai.

This root skill is a **routing index**. It tells you which sub-skill to load for a task. The sub-skills hold the focused, verified recipes. Load only what you need so context stays lean.

## What Quox is (60-second orientation)

Quox (product name for the QuoxCORE platform) is a **governed multi-agent operations platform**: a fleet of specialist AI agents (37 in the core registry, orchestrated by CommanderQ) that run auditable workflows, execute tools, remember across sessions, pause for human approval (HITL), and emit tamper-evident evidence of everything they do. It ships as a Docker stack of services (auth, collector, quoxflow, memory, tasks, files, orchestrator) with a React dashboard, a first-class `quox` CLI/TUI, a QuoxMCP adapter, 40 installable plugins, and four open governance protocols (AEE / AOCL / VOLT / WARD). The differentiator: **every agent action is cryptographically provable**. (Plugin and tool counts regenerated 2026-07-25.)

## Which sub-skill do I load?

| You want to… | Load |
|---|---|
| Understand the platform, concepts, service topology, "where does X live" | `quoxpert-core` |
| Drive Quox from the terminal (`quox` CLI + TUI): agents, workflows, chat, HITL, fleet, governance | `quoxpert-cli` |
| Wield Quox's tools from inside Claude via QuoxMCP (install + the 130+ RBAC-gated tools) | `quoxpert-mcp` |
| Build, run, or inspect workflows (quoxflow: nodes, AOCL pipeline, triggers, objectives, skills) | `quoxpert-flow` |
| Operate the agent fleet + governed SSH execution (QuoxBastion + quoxagent) | `quoxpert-bastion` |
| Build a `.quoxplugin` extension (the plugin SDK, plugin backends, publishing) | `quoxpert-plugin-sdk` |
| Read/verify governance evidence (AEE envelopes, AOCL layers, VOLT bundles, WARD chains) | `quoxpert-protocols` |
| Install / upgrade / back up / configure a Quox instance | `quoxpert-deploy` |
| Multi-instance fleet control across quox-boxes (monitor, enroll, checks, backups, governed delegation, QLOGS) | `quoxpert-qluster` |
| Turn an existing tool (MCP server, dashboard, chat-ops bot, script, agent) into a Quox plugin | `quoxpert-convert` |
| Understand what's shippable today for distributing/monetising a plugin (signing, licensing, what's not live yet) | `quoxpert-publish` |
| Search/cite a codebase, map blast radius, connect and index a repo (RepoBrain / Nucleus) | `quoxpert-repobrain` |
| Read or update a roadmap/stream (QuoxPlan), brief on a stream, script roadmap changes | `quoxpert-quoxplan` |
| Need a VM / move heavy work off <dev-box>, Proxmox VM or node operations, rehearse a risky change on an isolated twin, VM pool config | `quoxpert-hyperion` |
| What needs the owner / sitrep, add or debug a LUCID feed, change how LUCID words something, tune the Herald (calls, nudges) | `quoxpert-lucid` |
| SEO data for a Quox site: crawl health, GSC, orphans, the witnessed change log, `quox seo` | `quoxpert-quoxseo` |
| Attach a live session to an agent so it becomes that agent (adopt prompt/tools/memory, witnessed identity, persistent memory): `quox agent attach/exec/detach`, QuoxIdentity | `quoxpert-quoxidentity` |
| Operate/govern the RESIDENT agent (Quoxperticus): the OFF/OBSERVE/PARTIAL/FULL mode dial, `quox dev resident` + `quox dev supervisor`, hold-is-the-voice, witnessed turns, the honest execution boundary | `quoxpert-quoxperticus` |
| Run governed vulnerability scans (QuoxSecurity: engagements, verified in-scope targets, nuclei/nmap/httpx tools, findings, reports), `quox engagement` | `quoxpert-security` |
| Connect/manage an external service credential (QuoxVault: `quox vault`, folders, agent assignments, leases, rotation, the `vault_*` agent tools) | `quoxpert-vault` |
| Post to X (Twitter) through the governed HITL loop: `quox x` post/thread/delete/status, credential setup, budgets, campaign craft | `quoxpert-x` |
| Publish to LinkedIn through the governed HITL loop: `quox linkedin` post/comment/posts/org, pasted-token credentials with tracked 60-day expiry, image-by-URL | `quoxpert-linkedin` |
| Publish to Facebook Pages through the governed HITL loop (organic only, ads = META-ADS): `quox facebook` post/pages/posts/insights/lead-forms/leads, shared `meta` 60-day token | `quoxpert-facebook` |
| Publish to Instagram through the governed HITL loop (container flow, shared `meta` token via Page linkage): `quox instagram` verbs, 100-posts/24h quota | `quoxpert-instagram` |
| Publish to TikTok through the governed HITL loop (SELF_ONLY until app audit, 24h access token): `quox tiktok` verbs, draft + direct post | `quoxpert-tiktok` |
| Publish to YouTube through the governed HITL loop (8 gated writes, hourly token refresh with vault write-back, org media root, quota honesty): `quox youtube` verbs | `quoxpert-youtube` |
| Read/write governed markdown notes (NotesQ, the Brain2 notebook layer): `quox notes` ls/show/new/edit/search/facets/history/restore/rm/related, 409 conflicts, revisions | `quoxpert-notesq` |
| Find, add, call or email a PERSON without exposing their number (ContactsQ): `quox contacts` search/resolve/call/import/merge/erase/dsar/grants, agent contacts_* tools, approval + standing grants, uk-pecr-gdpr refusal codes | `quoxpert-contactsq` |
| Exact flags/usage for org, team, role, SSO, SCIM, domain, MFA, invite, webhook, consent verbs (`quox org`, `quox role`, `quox sso` ...) | `quoxpert-cli-org` |
| Exact flags/usage for platform verbs: admin, server, update, settings, config, backup, budget, llm-policy, provider, licence, mon | `quoxpert-cli-platform` |
| Exact flags/usage for governance and evidence verbs: governance, evidence, aee, volt, trace, done, engagement, approvals, inbox | `quoxpert-cli-governance` |
| Exact flags/usage for fleet and awareness verbs: slot, sessions, active, presence, hyperion, vm, router, lucid, rows | `quoxpert-cli-fleet` |
| Exact flags/usage for agent, assistant, tool, skills, plugin, powers, workflow, run, prompt verbs | `quoxpert-cli-build` |
| Exact flags/usage for memory, brain, entity, file, tag, conversation, actions, notes verbs | `quoxpert-cli-knowledge` |
| Exact flags/usage for contacts, mail, calendar, voice, quoxchat, qlarity, seo, x, youtube, discord, vault verbs | `quoxpert-cli-channels` |

When in doubt, start with `quoxpert-core` for orientation, then narrow.

## Install & connect (never paste a secret in chat)

**Install Quoxpert** (two ways):
- **Claude Code marketplace:** `/plugin marketplace add quoxai/quoxpert` then enable the `quoxpert` plugin.
- **Curl:** `curl -sSL https://quox.ai/quoxpert/install.sh | bash` (copies the sub-skills into `~/.claude/skills/`).

**Connect to a Quox instance**: the sub-skills teach *where* your credentials live (the instance's `.env` `INTERNAL_SERVICE_KEY`, your `quox login` session, your MCP token) and how to point Claude at them. **Quoxpert never asks you to paste a secret into the conversation.** It tells you the file/env/command, you wire it yourself. See `quoxpert-cli` (login) and `quoxpert-mcp` (MCP connect).

## What Quoxpert is NOT

- **NOT QSKL**: QSKL / Crystals are Quox's *internal* procedural-knowledge system for its *own* agents. Quoxpert is for *your* Claude, about operating Quox.
- **NOT QuoxNucleus / repobrain**: that's a codebase-intelligence engine. Quoxpert *uses* it as a source for staying current, but it is not the skill.
- **NOT the `.claude/skills/*` dev slash-skills**: those are for engineers working *on* the Quox codebase. Quoxpert is for *operating* Quox.
- **NOT QUOX-DEEP**: that's UI-recording recipes for making demo videos.

## Staying current (the moat)

Each sub-skill mixes **generated blocks** (auto-refreshed from the Quox codebase: `CODEBASE_MAP.md`, concept docs, `quox --help`, the live tool list) with **hand-authored recipes** (verified transcripts). A drift-check CI fails when a Quox surface changes but its sub-skill wasn't updated, so Quoxpert can't silently rot. If a recipe here disagrees with your live instance, trust the instance and report it: the skill is versioned against a `quox_version`, and a mismatch is a bug to file, not to guess around.
