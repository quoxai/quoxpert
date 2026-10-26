---
name: quoxpert-plugin-sdk
description: "Build, validate, sign, and install community plugins for QuoxCORE
  using the quox-plugin-sdk (scaffolder, sandbox runtime helpers, Vite build
  plugin and quox-plugin CLI) and the quox CLI's `plugin` command group. Load
  when the user wants to write a new Quox plugin, add a backend to one, or
  install/manage an already-built plugin on their instance."
argument-hint: "<task, e.g. 'scaffold a monitoring plugin' or 'sign and install my plugin'>"
metadata:
  quoxpert:
    source_repo: quox-plugin-sdk (create-quox-plugin, quox-plugin-sdk, quox-plugin-vite) + quox-dashboard (cli/, collector plugin gateway)
    sources:
      - repo: quox-plugin-sdk
        path: README.md
      - repo: quox-plugin-sdk
        path: docs/plugin-api.md
      - repo: quox-plugin-sdk
        path: docs/templates.md
      - repo: quox-plugin-sdk
        path: docs/signing.md
      - repo: quox-plugin-sdk
        path: docs/dev-preview.md
      - repo: quox-plugin-sdk
        path: docs/backend-plugins.md
      - repo: quox-dashboard
        cmd: "node cli/bin/quox.js plugin --help"
    generated_at: 2026-10-13
    quox_version: ">=0.1 pre-1.0"
license: LicenseRef-SkillRights-Reserved-1.0
---

# Quoxpert: Building Community Plugins

## What this is

`quox-plugin-sdk` is a 4-package toolkit: `create-quox-plugin` (scaffolder),
`quox-plugin-sdk` (runtime helpers, types, mock `window.quox` for tests),
`quox-plugin-vite` (Vite plugin plus the `quox-plugin` CLI: `validate`,
`keygen`, `sign`) and `eslint-plugin-quox-plugin`. A community plugin is a
React bundle (`dist/plugin.esm.js` + `dist/plugin.css`) plus a `manifest.json`
at the project root, optionally signed (`dist/signature.json`). There is no
`.quoxplugin` ZIP flow and no `pluginApi` object: those are retired.

The author-facing skill ships INSIDE every scaffold at
`.claude/skills/quox-plugin/SKILL.md` (source:
`quox-plugin-sdk/packages/create-quox-plugin/skill/quox-plugin/SKILL.md`).
Defer to it for in-project authoring detail; this skill is the Quoxpert-side
map and the operator's install/sign recipe.

## The sandbox model (state this exactly)

- Community plugins run in an opaque-origin iframe (`sandbox="allow-scripts"`)
  with CSP `connect-src 'none'`. No network of their own, no host DOM, no
  cookies, no host components, no host stylesheets.
- The only door is `window.quox`, obtained with `getQuox()` from
  `quox-plugin-sdk` (promise-based, bridged over postMessage):
  `storage.get/set/remove/keys/getAll` (server-side, per plugin per org),
  `fetch(path)` to the plugin's OWN backend via the collector gateway
  (relative path only; absolute URLs and `..` refused), `navigate`, `notify`,
  `getUser`, `onEvent`.
- `memory.save/search` and `aee.emit` exist but reject with
  `not_available: memory` / `not_available: aee` (no collector route yet).
  Do not build on them.
- No `__quoxGlass`, no host components (those are throwing stubs). Styling is
  `qx-*` classes, bundled into `plugin.css` by `quox-plugin-vite`.
- Agent/team registration from a manifest is ignored in the sandbox; `tools`
  is official-plugin only.

## Permissions (enforced, fail-closed)

Declared `manifest.permissions` are enforced in the sandbox on every call.
Absent permissions grant nothing. Refusal: `permission_denied: <perm>`.

| Call | Permission |
|---|---|
| `storage.*` | `storage` |
| `fetch` | `network` |
| `notify` | `notifications` |
| `memory.*` | `memory` (then `not_available`) |
| `aee.emit` | `aee` (then `not_available`) |
| `navigate`, `getUser`, `onEvent` | none |

`sidebar` is navigation (declarative); `tools` is official-plugin only.
Declare exactly what the code uses: `npm run validate` errors on a used-but-
undeclared permission and warns on declared-but-unused.

## Flow: scaffold to installed

    npx create-quox-plugin my-plugin --template basic
    cd my-plugin && npm install
    npm run dev          # sandbox-faithful preview (iframe, CSP, mocked host)
    npm run build        # dist/plugin.esm.js + dist/plugin.css
    npm run validate     # manifest + permission declared-vs-used + host-only globals
    npx quox-plugin keygen --out .keys     # once; .keys/ is gitignored, never commit
    npm run sign         # dist/signature.json, over plugin.esm.js bytes ONLY

Org admin trusts the author's public key (`.keys/plugin-signing.pub`, 64 hex):

    quox plugin trusted-keys add --label "<label>" --public-key <hex>
    quox plugin trusted-keys list

Install (admin only; `update` needs the same `--signature` once keys exist):

    quox plugin install --manifest manifest.json --bundle dist/plugin.esm.js \
      --css dist/plugin.css --signature dist/signature.json
    quox plugin list ; quox plugin mine

With a trusted key set, an unsigned install is 403 `unsigned` and a tampered
bundle is 403 `digest_mismatch` (proven on dev 2026-10-13). An org with no
trusted keys accepts unsigned installs. Other refusal reasons:
`invalid_structure`, `no_matching_key`, `bad_signature` (see docs/signing.md).
Rebuild means re-sign. Removing the last trusted key needs `--confirm-unsigned`.

Packages: published to npm as 0.2.0 once the owner runs the publish. Until
then, build from a checkout of quox-plugin-sdk and scaffold with
`--local-sdk <path-to-checkout>` (file: deps, monorepo development only).

## Templates (8)

`basic` (getUser + storage counter), `monitoring-dashboard` (polls backend
`/status`), `fleet-management` (host table, confirm modal, backend actions),
`service-bridge` (third-party integration via backend), `ui-feature`
(client-side card grid in storage), `enterprise-extension` (usage meters,
upgrade gates, ships `backend/` + `Dockerfile`), `specialist-agent`,
`agentic-team`. All target the sandbox, declare exactly the permissions their
code uses, and render an error state on RPC failure. Other flags:
`--from-mcp "<cmd>"` (specialist-agent from an MCP tool list), `--no-skill`,
`--non-interactive`.

Anything needing the network, hosts, a vault or a model calls the plugin's
own backend through `getQuox().fetch('/path')`.

## Backend plugins

Manifest field `backend: { image, port, healthPath }`; `enterprise-extension`
scaffolds `backend/` and a `Dockerfile`. The browser never reaches it
directly: `getQuox().fetch(path)` goes through the collector gateway to
`/api/v1/plugins/<id>/...`, which adds auth headers (`X-User-Id`,
`X-Plugin-Id`), rate limiting and health checks. The container image is taken
from the INSTALLED manifest, not from a request. The backend admin routes are
being hardened (finding FND_01M4SZ7NNV4NZ57ZM6J34NZ57Z): check
docs/backend-plugins.md on main before recommending any register/curl recipe.

## Command map
<!-- quoxpert:generated:start command-map -->
| Command | Purpose |
|---|---|
| `npx create-quox-plugin <name> --template <t>` | Scaffold from one of 8 templates |
| `npm run dev` / `build` / `validate` / `sign` | Preview / bundle / check / sign (in the scaffold) |
| `npx quox-plugin keygen\|validate\|sign` | The SDK CLI behind those scripts |
| `quox plugin install` / `update` / `uninstall` | Admin: install, upgrade/toggle, remove |
| `quox plugin list` / `get` / `mine` | Installed / details / visible to me |
| `quox plugin trusted-keys` | Admin: per-org trusted Ed25519 keys |
| `quox plugin assign` | Admin: visibility assignments |
| `quox plugin doctor <name>` | In-house dev-bundle DoD check (13-point chain + five prohibitions) |
| `quox plugin licence <pluginId>` | Licence band and entitlement for this org |
| `quox plugin data` / `quox plugin secrets` | Admin CLI surfaces for plugin KV data and encrypted secrets. NOT sandbox APIs |
| `quox powers ...` | Separate product: deploy an MCP endpoint or repo as a governed agent (see `quoxpert-mcp`) |
<!-- quoxpert:generated:end command-map -->

Never ask a user to paste a secret into chat: `quox plugin secrets set`
stores it encrypted server-side; handle only the name. `secrets reveal` is
audited break-glass.

## Testing

`quox-plugin-sdk/testing`: `installMockQuox({ pluginId, fetch, user,
permissions | manifest })` / `uninstallMockQuox()`; `createMockQuox` builds
without installing. memory/aee reject `not_available` like the host. The old
`createMockPluginApi`, `setupPluginTestEnv`, `setupGlassMocks` throw.

## Gotchas

- **`quox plugin install` 403 `signature_invalid` prints a misleading
  "Try quox org switch" hint.** It is a signature problem (wrong key, not
  trusted, or bundle changed after signing), not an org problem. Filed
  quox#803.
- **Signature covers `plugin.esm.js` only.** Changing `plugin.css` or
  `manifest.json` after signing does not invalidate it; keep them under
  release control.
- **Install is admin-only.** A 403 on install/update/trusted-keys is the role
  (or a signature reason above), not a broken build.
- **`quox plugin doctor` assumes the in-house monorepo shape.** It is not the
  third-party gate; use `npm run validate` for community plugins.
- **Plugin id**: `^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$`, not starting with
  `core-`, `system-`, `quox-`, `admin-`. Must match across manifest,
  `registerPlugin(id, ...)` and sidebar paths.
- **A call that "does nothing"** is a missing permission or an unrendered RPC
  error: read the rejection (`permission_denied`, `not_available`).
- **Dev preview is an approximation**: React comes from node_modules, no HMR,
  `fetch` 404s `dev_backend_not_configured` unless `devBackendUrl` is set.
  Confirm storage and backend calls on a real install.
- **Styling rules**: `qx-*` classes only, no grey text, buttons always
  `qx-btn`. Avoid `currentColor` SVGs on dark themes.
- **`.quoxplugin` install vs `quox powers deploy`** are different products;
  do not scaffold a plugin for what POWERS does in one command.
