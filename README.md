# Quoxpert

SkillRights-NoTrain-1.0: AI execution permitted. Model training rights reserved. https://skillrights.org/notrain/1.0

**Quox as a Claude-extension, wielded like a samurai.**

Every other integration in the Quox ecosystem points one direction: Claude extends Quox
(QuoxMCP feeds tools into Quox's collector; the dashboard drives Claude via OAuth CLI; the
plugin SDK extends QuoxCORE). **Quoxpert flips the arrow.** It's a distributable
[Claude Agent Skill](https://www.anthropic.com/news/agent-skills) — packaged as a Claude Code
plugin — that any Claude (Claude Code, Claude Desktop, claude.ai, or an Agent SDK app) can
install to become an instant expert in operating, deploying, extending, and debugging the
entire Quox ecosystem.

Quoxpert doesn't describe Quox — it teaches Claude to *drive* it: QuoxMCP's 130+ dynamic RBAC-gated tools, the
`quox` CLI/TUI, install and deploy flows, and the governance model (DEFCON levels, HITL
approvals) that every operation respects.

The audience is **external**: a Quox customer's Claude, a prospect's Claude evaluating Quox, a
plugin developer's Claude. Not our own dev sessions — those already have `.claude/skills/`.

## What Quoxpert is NOT

Four confusions recur enough that they're worth stating explicitly, up front.

| System | What it is | Why Quoxpert is different |
|---|---|---|
| **QSKL** (Crystals/Skills) | Quox's *internal* skill system — crystallised scripts formed from executions, stored server-side, run by Quox's own agents (SENTINEL, NOVA, …) under governance. `quox skills list` manages these. | Quoxpert is a skill for **Claude**, not for Quox's agents. It lives in `~/.claude/skills` / a plugin, not in Quox's database. Quoxpert *teaches* Claude to manage QSKL crystals via the CLI — it is not one of them. |
| **QuoxNucleus / repobrain** | Codebase intelligence — indexes Quox's own repos and answers "where is X?" with file:line snippets. Runs as a service inside the Quox stack. | Repobrain is a **data source** for Quoxpert's regen pipeline and a tool the skill can teach about — not the skill itself. Nucleus knows Quox's code; Quoxpert knows how to operate the Quox product. |
| **QUOX-DEEP** (internal `/quox-user*` skills) | Internal Playwright recipes for driving the Quox dashboard UI to produce screen recordings. Audience: an internal recording harness. | Different audience, different verbs (CSS selectors + browser automation helpers). Quoxpert may cite the same UI flows but teaches them via CLI/MCP/API — never via UI selectors. |
| **Internal `.claude/skills/*` dev slash-skills** | Skills for working *on* Quox's own source code (`/preflight`, `/nucleus`, `/deploy`, …). Assume a dev box with every Quox repo checked out locally. | Quoxpert assumes a **user's machine**: no source checkout, no internal build tooling, no access to Quox's own infra. It teaches the shipped product surface only. |

The rule of thumb for every sentence in this repo: *does this work on a laptop that has only
installed Quox from quox.ai?* If a sentence needs an internal dev-box path or internal
tooling to be true, it doesn't belong here.

## Install

**Marketplace-first** (recommended — one-command install with a built-in update path):

```
/plugin marketplace add quoxai/quoxpert
/plugin install quoxpert
```

This works the same way inside Claude Code, and the same plugin artifact loads in the Claude
Agent SDK.

**Curl installer** (fallback — headless boxes, bare skill directories, no plugin support):

```bash
curl -sSL https://raw.githubusercontent.com/quoxai/quoxpert/main/install.sh | bash
```

Copies each sub-skill into `~/.claude/skills/`. Idempotent — safe to re-run to pick up updates.

**Per-skill ZIPs** (for claude.ai / Claude Desktop skill upload, where a full plugin install
isn't available): grab `quoxpert-<sub-skill>.zip` from the
[latest release](https://github.com/quoxai/quoxpert/releases) and upload it directly.

No install path ever asks you to paste a secret into a chat message or a shell one-liner.
QuoxMCP connection details (collector URL, service key) are entered directly into QuoxMCP's own
install dialog or config file — see `quoxpert-mcp`'s recipes once installed.

## The sub-skills

One root index skill routes to fourteen focused sub-skills, mirroring the proven
`quox-user` master-index pattern already used internally:

| Skill | Covers |
|---|---|
| `quoxpert` | Root index — ecosystem map, mode detection (MCP present? shell present? neither?), decision table routing to the sub-skills below, governance posture. Load this first. |
| `quoxpert-core` | QuoxCORE / the dashboard platform — concepts (crystals, agents, workflows, tools, governance), architecture, counts. |
| `quoxpert-cli` | The `quox` CLI and TUI — all 20 command groups, `--json` scripting, HITL/approval flows from the terminal. |
| `quoxpert-mcp` | Installing and wielding QuoxMCP: the 130+ dynamic RBAC-gated tools, 5 resources, 4 operational prompts, RBAC, and `quox powers`. |
| `quoxpert-flow` | The QuoxFlow workflow engine. |
| `quoxpert-bastion` | QuoxBastion + QuoxAgent fleet management. |
| `quoxpert-plugin-sdk` | Building `.quoxplugin` extensions with `create-quox-plugin` — makes any Claude a competent Quox plugin author. |
| `quoxpert-protocols` | AEE, AOCL, VOLT, and WARD — the envelope, audit-layer, governance, and policy specs, one combined skill. |
| `quoxpert-deploy` | Install, upgrade, backup, and the quox.ai product surface — the full-stack quickstart. |
| `quoxpert-qluster` | Qluster (multi-instance fleet control plane, phase 5c/QLOGS complete): monitor, enroll, checks, backups, governed delegation, QLOGS evidence. |
| `quoxpert-convert` | Convert an existing tool (MCP server, dashboard, bot, agent, scripts, micro-SaaS) into a Quox plugin. |
| `quoxpert-publish` | Honest stub on distributing/monetising a plugin: what's real (signing, licensing) vs not live yet (marketplace, payments). |
| `quoxpert-repobrain` | RepoBrain / Nucleus code-intelligence: structure-first retrieval, connecting/indexing repos, the "reach for it before grep" discipline. |
| `quoxpert-quoxplan` | QuoxPlan roadmap suite: the canonical roadmap store since the 2026-07-25 cutover, the `quoxplan`/`quox plan` CLIs, the TUI, and the `quoxplan_*` agent tools. |

Every recipe in every sub-skill is meant to be a *verified transcript* — actually run against a
live Quox instance during authoring — not synthesised from docs alone. A skill that only
describes Quox is a brochure; Quoxpert's sub-skills are written to be driven.

## Repo layout

```
quoxpert/
├── .claude-plugin/marketplace.json  # makes this repo an installable plugin marketplace
├── plugin/
│   ├── .claude-plugin/plugin.json   # the plugin manifest
│   └── skills/quoxpert*/SKILL.md    # root skill + 13 sub-skills
├── sources/manifest.json            # regen input map: which sources feed which sub-skill
├── scripts/
│   ├── regen.mjs                    # marker-replace engine (see below)
│   ├── drift-check.mjs              # CI enforcement
│   └── package.mjs                  # emits dist/ release artifacts
├── install.sh                       # curl-install fallback
└── .github/workflows/drift-check.yml
```

## Keeping it current

A stale skill teaches Claude *wrong* Quox — confidently wrong is worse than absent. Every
sub-skill's `SKILL.md` is split into generated blocks (command tables, tool tables, counts —
anything that churns fast) and hand-authored prose (recipes, gotchas, decision tables — the
actual expertise). Generated blocks live between markers:

```
<!-- quoxpert:generated:start command-map -->
...machine-written table...
<!-- quoxpert:generated:end command-map -->
```

`scripts/regen.mjs` reads `sources/manifest.json`, fetches each declared input (a file, a
section of a file, or a command's output from a sibling repo checkout), and re-renders exactly
the content between those markers — deterministically, so re-running on a clean tree is a
no-op. Everything outside the markers is never touched by regen.

`scripts/drift-check.mjs` is the enforcement layer, modeled on quox-dashboard's
`endpoints-lint.test.js` anti-drift precedent: it re-hashes every declared source and **fails**
(exit 1) if a source changed since the sub-skill's last regen, or if `regen.mjs --check` finds
the generated blocks are stale. It runs on every PR and nightly
(`.github/workflows/drift-check.yml`) — a red nightly means an upstream Quox repo changed a
public surface (a CLI command, a route, a concept) without Quoxpert catching up, and is the
signal to run `regen.mjs` and re-verify the affected recipes live.

**The discipline, in one sentence:** when any Quox repo's externally-visible surface changes —
CLI commands/flags, API routes, concepts, install/deploy flow, protocol specs, or a new/renamed
repo/agent/plugin — the corresponding Quoxpert sub-skill update happens in the *same unit of
work* as the change, not as separate cleanup. Until the full regen pipeline covers every
generated block (v0.1 ships the marker-replace engine plus two real generators — the CLI
command map and the QuoxCORE counts table — with the rest scaffolded as TODOs), that means a
short hand-update checklist: identify the surface change, open the owning sub-skill, update the
relevant table/recipe by hand, bump `generated_at` in its frontmatter, and re-run the affected
recipe against a live instance before committing.

## License

[Apache-2.0](./LICENSE) covers the code in this repo (scripts, plugin manifest, tooling) —
this is expertise whose value is adoption; it's licensed maximally shareable on purpose.

The 14 skills under `plugin/skills/*/SKILL.md` additionally carry a
[SkillRights](https://skillrights.org/spec/) declaration
(`LicenseRef-SkillRights-NoTrain-1.0`, text in `LICENSES/`): agent execution is
permitted exactly as Apache-2.0 already allows, and model-training rights on the
skill content itself are separately reserved. The two coexist — Apache-2.0 answers
"can I run/fork/redistribute this code", SkillRights answers "can a model be trained
on this skill's expertise" — neither narrows the other.
