---
name: quoxpert-plugin-sdk
description: "Build, test, sign, and install `.quoxplugin` extensions for
  QuoxCORE using the quox-plugin-sdk (scaffolder, runtime helpers, Vite build
  plugin) and the quox CLI's `plugin`/`powers` command groups. Load when the
  user wants to write a new Quox plugin, add a backend to one, or install/
  manage an already-built plugin on their instance."
argument-hint: "<task, e.g. 'scaffold a fleet-management plugin' or 'install my .quoxplugin file'>"
metadata:
  quoxpert:
    source_repo: quox-plugin-sdk (create-quox-plugin, quox-plugin-sdk, quox-plugin-vite) + quox-dashboard (cli/, RES.5 gateway)
    sources:
      - repo: quox-plugin-sdk
        path: README.md
      - repo: quox-plugin-sdk
        path: docs/templates.md
      - repo: quox-plugin-sdk
        path: docs/plugin-api.md
      - repo: quox-plugin-sdk
        path: docs/backend-plugins.md
      - repo: quox-dashboard
        cmd: "node cli/bin/quox.js plugin --help / plugin data --help / plugin secrets --help / powers --help"
    generated_at: 2026-07-25
    quox_version: ">=0.1 pre-1.0"
---

# Quoxpert — Building `.quoxplugin` Extensions

## What this is

`quox-plugin-sdk` is a 3-package toolkit (`create-quox-plugin` scaffolder,
`quox-plugin-sdk` runtime/testing helpers, `quox-plugin-vite` build plugin)
for building third-party extensions to QuoxCORE. Plugins can add sidebar
navigation, new views, agent tools, and even server-side backends. The build
output is a `.quoxplugin` file — a ZIP containing `manifest.json`, a compiled
ESM bundle (React externalised via `window.__quoxSharedDeps`), optional CSS/
assets, and an optional Ed25519 `signature.json`.

Eight scaffold templates cover most shapes: `basic`, `monitoring-dashboard`,
`fleet-management`, `service-bridge`, `ui-feature`, `enterprise-extension`,
`specialist-agent`, `agentic-team`. Plugins that need a real backend run as
**host-managed containers behind a same-origin gateway** (the collector
proxies `pluginApi.fetch()` calls — plugin code never makes direct external
requests), so a plugin author never has to think about CORS or exposing a
port.

## When (not) to use this sub-skill

Use this when the user wants to: scaffold a new plugin, understand the
manifest/permission model, wire up the `pluginApi` surface (storage,
notifications, memory, AEE events, fetch), add a Docker backend to a plugin,
sign/license a plugin for paid distribution, or install/manage an
already-built plugin on a running instance (`quox plugin ...`).

**Do NOT use this for:**
- Fleet/host operations (SSH, tool registry, agent deploy) → the bastion
  skill, even if you're building a `fleet-management` template plugin — that
  template's *runtime* target is this skill, but *operating* an existing
  fleet is the bastion skill.
- Deploying a hosted MCP server as a governed agent — that's `quox powers`,
  a distinct path from `.quoxplugin` (see Gotchas): POWERS turns an MCP
  endpoint or a public repo into an agent; the plugin SDK turns your own
  React+backend code into a sidebar extension. Full `quox powers` recipes
  live in `quoxpert-mcp` (the owning skill).
- **This is not Quoxpert itself.** The relationship is a direction, not an
  overlap: `quox-plugin-sdk` packages a *developer's* code INTO QuoxCORE
  (`.quoxplugin`); Quoxpert packages *Quox expertise* INTO Claude (this
  skill format). Using this sub-skill makes your Claude a competent Quox
  plugin author — it doesn't make Quox smarter about itself.

## Install & connect

The SDK is npm tooling — no server-side install, no secret needed to start
building:

    npx create-quox-plugin my-plugin
    cd my-plugin && npm install && npm run dev

To **install** a finished plugin on a live instance, the org admin uploads
the `.quoxplugin` file through Settings → Plugins → Community Plugins, or
via the CLI once authenticated:

    quox login
    quox plugin install --manifest manifest.json --bundle plugin.esm.js --css plugin.css

If the org has trusted signing keys configured, add `--signature`. Never ask
a user to paste a plugin secret (API key, webhook token, etc.) into chat —
those go through `quox plugin secrets set`, which stores them encrypted
server-side; you only ever handle the secret's *name*, never its value.

## Command map
<!-- quoxpert:generated:start command-map -->
| Command | Purpose |
|---|---|
| `npx create-quox-plugin <name> [--template <t>]` | Scaffold a new plugin from one of 8 templates |
| `npm run dev` / `npm run build` | Dev server / produce the `.quoxplugin` ZIP |
| `quox plugin list` / `get` / `mine` | List installed plugins / details / plugins visible to you |
| `quox plugin install` / `update` / `uninstall` | Install, upgrade/toggle, remove a plugin (admin only) |
| `quox plugin data` | list/get/set/delete plugin-scoped durable KV data |
| `quox plugin secrets` | list (metadata only)/set/reveal (audited)/delete plugin-scoped encrypted secrets |
| `quox plugin assign` | Manage plugin visibility assignments (admin only) |
| `quox plugin trusted-keys` | Manage per-org trusted Ed25519 signing keys (admin only) |
| `quox powers detect/deploy/deploy-repo/...` | Separate path: deploy a live MCP endpoint or public repo as a governed agent |
<!-- quoxpert:generated:end command-map -->

## Recipes (hand-authored — the actual expertise)

### 1. Scaffold and pick a template
    npx create-quox-plugin my-monitoring-plugin --template monitoring-dashboard
    cd my-monitoring-plugin && npm install

Templates by intent: `basic` (hello world), `monitoring-dashboard` (poll a
service, show status), `fleet-management` (host/container ops with safety
gates), `service-bridge` (third-party OAuth integration + specialist agent),
`ui-feature` (client-side tool with storage/config), `enterprise-extension`
(memory API + AOCL events + Docker backend + usage meters), `specialist-agent`
(a full agent persona + tools), `agentic-team` (multi-agent team + policies).

### 2. Dev loop
    npm run dev
    # edit src/index.jsx — window.__quoxPluginRegister('my-plugin', { routes, sidebar, hooks })

### 3. Build the distributable
    npm run build
    # → my-monitoring-plugin.quoxplugin (ZIP: manifest.json, plugin.esm.js, plugin.css, assets/)

### 4. Install it on a running instance
    quox login
    quox plugin install --manifest manifest.json --bundle dist/plugin.esm.js --css dist/plugin.css
    quox plugin list                 # confirm it's there
    quox plugin mine                 # confirm the current user can see it (respects assignments)

### 5. Wire up the plugin API surface (inside the plugin's own code)
    pluginApi.storage.set('lastScan', Date.now());
    pluginApi.notify('Scan complete', 'success');
    const res = await pluginApi.fetch('/api/status');   // proxied through the collector — no direct external calls
    await pluginApi.memory.save({ type: 'fact', content: '...', tags: [] });
    await pluginApi.aee.emit('plugin.scan.complete', { hostsFound: 3 });

### 6. Store and read plugin-scoped durable data server-side (not localStorage)
    quox plugin data set my-plugin lastScanId '"scan-42"'
    quox plugin data get my-plugin lastScanId
    quox plugin data list my-plugin

### 7. Store a secret the plugin needs, without ever pasting it in chat
    quox plugin secrets set my-plugin api-token         # prompts securely, or reads from a flag/file — never echo the value back
    quox plugin secrets list my-plugin                  # metadata only, no plaintext
    quox plugin secrets reveal my-plugin api-token       # admin-only, fully audited — use sparingly

### 8. Sign a plugin for paid/trusted distribution
    node scripts/generate-signing-key.js
    node scripts/sign-plugin.js --plugin ./my-plugin.quoxplugin --key ./quox-signing.key
    node scripts/generate-license.js --plugin my-plugin --customer "Acme Corp" --expires 2027-12-31 --key ./quox-signing.key

### 9. Test with the SDK's mock plugin API
    # in a test file:
    import { createMockPluginApi, setupPluginTestEnv, teardownPluginTestEnv } from 'quox-plugin-sdk/testing'
    npm test    # (representative — runs vitest across all packages)

### 10. Manifest field reference (fill in `manifest.json` correctly the first time)
Beyond `id`/`name`/`version`/`author`/`description`/`category`/`license`/`permissions`/`sidebar`/`routes`/`minQuoxVersion`:
- **`configSchema`**: one entry per config field: `{ type, label, description, default, premium?, enterprise? }`. Types: `string`, `number`, `boolean`, `password`, `select`, `url`. Every field needs a `type`, `label`, and `description`; a field missing any of these fails review, not just build.
- **`safety`**: `{ destructiveActions[], requiresApproval[], aeeRequired, killSwitchEnabled }`. Required for any plugin that touches infrastructure or runs destructive actions. This is what wires a `fleet-management`-style plugin into HITL.
- **`specialist`**: `{ name, description, capabilities[] }`. Registers a specialist agent for the plugin.
- **`comparison`** / **`limits`**: tier name → feature/limit name → value, for tiered (freemium/enterprise) plugins.
- **`capabilities`**: `{ aeeIntents[], toolAccess? }`. Declares which AEE intents the plugin emits.
- **`backend`**: `{ image, healthPath, port }`. Only present if the plugin ships a Docker backend.

Permissions map directly to `pluginApi` surface area. Request exactly what's used, nothing more:

| Permission | Grants |
|---|---|
| `sidebar` | Sidebar entry + route registration |
| `storage` | Server-side plugin-scoped key-value store (`quox plugin data`) |
| `notifications` | Toast notifications via `pluginApi.notify()` |
| `network` | HTTP requests via `pluginApi.fetch()` (proxied through the collector) |
| `memory` | `pluginApi.memory.save`/`.search()` |
| `aee` | `pluginApi.aee.emit()` |
| `tools` | Register agent tools for the plugin's specialist agent |

### 11. Debug the common plugin issues
- **Elements invisible on the dark theme.** Never use `stroke="currentColor"`/`fill="currentColor"` in an SVG; inherited colour disappears on a dark background. Use an explicit colour (`style={{ stroke: 'rgba(255,255,255,0.8)' }}`), and keep opacity ≥0.6 (prefer 0.7-0.85 default, 0.9-1.0 on hover). If an SVG is still invisible after one fix attempt, swap it for a Unicode glyph (`✕`, `⚡`, `▶`) rather than debugging further.
- **A `pluginApi` call silently does nothing.** Almost always a missing permission: `storage` for `pluginApi.storage`, `network` for `pluginApi.fetch`, `memory` for `pluginApi.memory.save`, `aee` for `pluginApi.aee.emit`. Add the permission to the manifest before looking anywhere else.
- **Build failures.** "adm-zip not found" → `npm install -D adm-zip`; "Cannot find module 'quox-plugin-vite'" → check `devDependencies`; ZIP not produced → confirm `manifest.json` exists at the project root; plugin doesn't load after install → confirm the runtime `pluginId` matches `manifest.id` exactly.
- **Plugin storage "not persisting."** It's namespaced by `pluginId`; if the ID changed between runs, the old data is orphaned, not lost. Always null-check `pluginApi?.storage`; it can be `null` during plugin init.

### 12. Audit a plugin for completeness before shipping
Before calling a plugin done, check each of these and fix anything that fails. This is the same bar a reviewer applies:
1. **Manifest completeness.** Every required field present, `permissions` matches what the code actually calls.
2. **`configSchema` validity.** Every field has `type`/`label`/`description`; secrets use `type: "password"`.
3. **`safety` block present** if the plugin has any destructive action, with `requiresApproval` covering the dangerous ones.
4. **Permissions audit.** No over-requesting (e.g. `memory` declared but never called) and no under-requesting (a `pluginApi` call with no matching permission).
5. **Dark-theme compliance.** No `currentColor` SVGs, no `rgba(255,255,255,...)` opacity below 0.6.
6. **Build output.** `manifest.json` + `plugin.esm.js` present in the ZIP, under the 100KB/5MB limits (recipe 3's Gotcha).
7. **Plugin ID hygiene.** Kebab-case, 3-64 chars, identical across `manifest.id`, the `index.jsx` registration call, and any sidebar route paths.

## Gotchas

- **Plugin routes are namespaced** (`/plugins/{pluginId}/...`) — don't
  hardcode a top-level route in a scaffolded plugin, it'll collide or be
  rejected.
- **Bundle size limits are real**: 100KB for `plugin.esm.js`, 5MB for the
  whole `.quoxplugin`. Vite's externalisation of React/ReactDOM/React Router
  is what keeps you under 100KB — don't bundle them yourself.
- **`plugin secrets reveal` is fully audited** — treat it as a break-glass
  action, not a routine read. Prefer `secrets list` (metadata only) for
  day-to-day checks.
- **Plugins cannot make direct external network requests** — `pluginApi.fetch`
  is proxied through the collector by design (same-origin gateway, RES.5).
  If a plugin needs to call a third-party API, the backend container (not
  the browser bundle) is the place to do it.
- **`.quoxplugin` install vs `quox powers deploy` are different products.**
  If the user wants "wrap this MCP server as an agent" or "deploy this GitHub
  repo as a hosted tool," that's `quox powers`, not this SDK — don't scaffold
  a plugin for a job POWERS already does in one command.
- **Install is admin-only.** `quox plugin install/update/uninstall/assign/
  trusted-keys` all require an admin role on the active org — a 403 here
  means the role, not a broken build.
