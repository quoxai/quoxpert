---
name: quoxpert-convert
description: "Convert an existing tool (MCP server, monitoring dashboard,
  chat-ops bot, vertical AI agent, devops scripts, report-scraper micro-SaaS)
  into a Quox plugin. Load when the user has working code and wants to know
  the fastest path to bring it into Quox rather than building a plugin from
  scratch."
argument-hint: "<what you're converting: mcp-server | monitoring-dashboard | chat-ops-bot | vertical-agent | devops-scripts | report-scraper>"
metadata:
  quoxpert:
    source_repo: create-quox-plugin (quox-plugin-sdk) + quox-dashboard (plugin gateway)
    sources:
      - repo: quox-plugin-sdk
        path: README.md
      - repo: quox-plugin-sdk
        path: packages/create-quox-plugin/bin/create.js
    generated_at: 2026-07-25
    quox_version: ">=0.1 pre-1.0"
license: LicenseRef-SkillRights-Reserved-1.0
---

# Quoxpert: Convert an existing tool into a Quox plugin

## What this is

You already have a working tool: an MCP server, a monitoring dashboard, a
chat-ops bot, a vertical AI agent, a folder of devops scripts, a small paid
report-scraper. This sub-skill is the fastest path to bringing it *into*
Quox rather than rebuilding it from a blank scaffold: which of the 8
`create-quox-plugin` templates fits, what wrapping it actually buys you, and
where the honest limits are today.

## When (not) to use this sub-skill

**Use it when:** the user says some version of "I already have X, how do I
make it a Quox plugin" or "what does Quox add if I bring my tool in."

**Don't use it for:**
- Scaffolding a brand-new plugin with no existing code, or the deep
  manifest/`pluginApi`/build mechanics once you've picked a template →
  `quoxpert-plugin-sdk`.
- Distributing or licensing a plugin once it's built → `quoxpert-publish`.
- Deploying a trusted MCP server as a governed agent with no plugin at all →
  `quoxpert-mcp` (`quox powers`).

## Tool-type triage matrix

| Your tool looks like… | Best-fit template | Why |
|---|---|---|
| An MCP server (stdio or HTTP, answers `tools/list`) | `create-quox-plugin --from-mcp` (scaffolds `specialist-agent`), or skip scaffolding and use `quox powers deploy` if you don't need custom UI | Introspects the server's real tools instead of you hand-writing tool wiring |
| A monitoring dashboard (polls a service, shows status; Grafana/Prometheus/Uptime-Kuma-style) | `monitoring-dashboard` | Vault-backed config, polling loop, license gate, status badges built in |
| A chat-ops bot (Slack/Discord/Telegram commands that trigger actions) | `service-bridge` or `specialist-agent` | OAuth vault plus a persona; your bot commands become agent tool calls instead of a bespoke command parser |
| A vertical AI agent you already run standalone | `specialist-agent` | Persona, tools, DEFCON/autonomy/budget/schedule come for free instead of you building them |
| A folder of devops/automation scripts | `fleet-management` | Safety gates plus AEE audit plus agent tools, matching the destructive-action shape those scripts usually have |
| A report-scraper or small paid micro-SaaS | `enterprise-extension` | Memory API, AOCL events, Docker backend, tiered limits/usage meters |

## Quoxification assessment (run this before scaffolding anything)

Audit the target tool and write a short "what Quox adds" report against these
six axes. For each, state the *before* (what the tool does today) and the
*after* (what wrapping it in Quox gives it). A feature list without the
before/after doesn't land with the user.

1. **Auth & multi-tenancy.** Does it have per-organisation isolation today?
   Wrapped in Quox, every user/data/config path is org-scoped automatically.
2. **Durable persistence.** Is state sitting in a local file, SQLite, or
   in-memory, gone on redeploy? `quox plugin data` (via `pluginApi.storage`)
   is server-side, per-plugin, durable across restarts.
3. **HITL approval.** Does it run destructive actions with no human gate
   today? The manifest's `safety` block (`requiresApproval`) wires that in.
4. **Agent chat.** Is it driven by a bespoke CLI or command syntax today?
   The `specialist-agent` shape gives it a persona any Claude session (or
   Quox's own chat UI) can drive conversationally instead.
5. **Evidence protocols.** Does it log anything auditable today?
   `pluginApi.aee.emit()` gets you a tamper-evident audit trail for free.
   See `quoxpert-protocols` for what that data means once you're emitting it.
6. **Distribution.** Is there a versioned, installable package today?
   `.quoxplugin` gives you that (see `quoxpert-publish` for what shipping it
   further than one customer actually looks like right now).

## Two routes: full plugin vs protocol SDKs only

- **Full plugin conversion** (this skill + `quoxpert-plugin-sdk`): the tool
  moves *into* Quox: sidebar, agent chat, HITL, multi-tenancy, all of it.
  This is the right call for almost everything in the triage matrix above.
- **Protocol SDKs only ("publishing at launch")**: for a team that doesn't
  want to wrap their tool in Quox at all, just have their *own* service speak
  the evidence formats natively (emit AEE envelopes, verify WARD chains,
  reason in AOCL layers). Today AEE/AOCL/VOLT/WARD are open specs, not
  packaged libraries (see `quoxpert-protocols`); language SDKs are planned
  to ship alongside Quox's public launch, not published yet. If a user wants
  "just the evidence format, not the platform," point them at the spec repos
  and be upfront that there's no installable SDK today.

## The `--from-mcp` fast path

If the tool being converted is already an MCP server, `create-quox-plugin`
can scaffold straight from it instead of you hand-writing the tool wiring:

```bash
npx create-quox-plugin my-agent --from-mcp "node my-mcp-server.js"
```

This spawns the given command as an MCP server, runs the MCP `initialize`
handshake, calls `tools/list`, and scaffolds a `specialist-agent` plugin with
the introspected tools already recorded as metadata. For a server you can't
run locally, `--from-mcp-json <file>` reads a previously-saved `tools/list`
result offline instead of spawning anything live. Either way, the scaffolded
tool descriptors are metadata for listing/display in the plugin's UI. Live
invocation of those tools is wired through `quox powers`, not executed
directly from the browser plugin sandbox (see `quoxpert-mcp` recipe 12).

If the MCP server is already trustworthy and there's no custom UI to build at
all, skip scaffolding entirely: `quox powers deploy` (see `quoxpert-mcp`) is
the zero-code path to "just make this MCP server a governed agent."

## Current limits (honest, as of 2026-07-25)

- **No plugin marketplace yet.** Distribution today is a direct file handoff
  or sideload install (`quox plugin install`); see `quoxpert-publish`.
- **npm publish is pending** for the SDK packages. Install today by running
  `npx create-quox-plugin` against the project's git source, not a published
  npm package name.
- **Non-React frontends aren't supported.** A plugin's browser bundle
  assumes React (externalised via `window.__quoxSharedDeps`), so a
  Vue/Svelte/vanilla-JS dashboard needs its UI layer rewritten; the backend
  logic usually ports over unchanged.
- **Backend hardening is in progress.** The same-origin gateway model
  (`pluginApi.fetch`) is solid, but check `quoxpert-plugin-sdk`'s Gotchas
  before shipping a plugin that handles sensitive third-party credentials.

## Where to go next

- Scaffold, build, sign, and install → `quoxpert-plugin-sdk`
- Distribute or license a finished plugin → `quoxpert-publish`
- Deploy a trusted MCP server as an agent with zero code → `quoxpert-mcp`
  (`quox powers`)
- Understand the evidence your converted tool can now emit →
  `quoxpert-protocols`
