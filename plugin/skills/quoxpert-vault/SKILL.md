---
name: quoxpert-vault
description: "Make any Claude fluent at QuoxVault, Quox's credential/integration
  layer: 400+ typed integration entries, org-scoped envelope-encrypted storage,
  folders, agent assignments, just-in-time leases, rotation, and a WARD-witnessed
  audit trail. Load when the task is 'connect an external service credential',
  'why did a tool call fail to find its API key', or anything touching `quox
  vault`, the Vault/Integrations dashboard views, or the vault_* agent tools."
argument-hint: "<task, e.g. 'connect a Slack credential', 'approve a lease', 'why is this API key untested'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard
    stream: VAULT-INTEG
    sources:
      - repo: quox-dashboard
        path: services/auth/config/integrationTypeRegistry.js
      - repo: quox-dashboard
        path: cli/lib/commands/vault.js
      - repo: quox-dashboard
        path: docs/STATUS_AND_LIMITS_VAULT.md
    generated_at: 2026-09-06
    quox_version: ">=0.1 pre-1.0"
license: LicenseRef-SkillRights-Reserved-1.0
---

# Quoxpert: QuoxVault (credential / integration layer)

## What this is

QuoxVault is where Quox stores the credential a tool, agent, or workflow needs
to reach an external service: an API key, an SSH private key, a database
password, a webhook secret. Every credential is **typed** against a catalogue
of 400+ entries (`services/auth/config/integrationTypeRegistry.js`, 413 types
verified live), each declaring its own field set, a field-shape validator, and
(for 302 of the 413) a live `testEndpoint` the vault calls to prove the
credential actually works before trusting it. Storage is org-scoped
(`integration_credentials` table) and encrypted at rest with AES-256-GCM
envelope encryption: a per-credential DEK wrapped by an instance-wide KEK
derived from `MASTER_ENCRYPTION_KEY`. The auth service exposes it at both
`/vault/*` and `/integrations/*` (the second is the older name, kept as an
alias, not a separate system).

Beyond plain storage, the vault adds the pieces that make it a governed layer
rather than a `.env` file with a UI: **folders** to organise credentials,
**agent assignments** (which credential a given agent uses for a given tool
type), **just-in-time leases** (an agent requests time-boxed access, a human
approves or denies via HITL), **rotation** with an optional post-rotation
test, and a **WARD-witnessed audit trail** so every secret release is
tamper-evidently logged. Resolution when something asks "what key do I use
here" follows a fixed waterfall: user BYOK (if the org allows it and a
userId is given) → org vault default → instance scope → environment variable,
last resort. `credentialResolver.js` is the source of truth for that order;
don't reimplement it elsewhere.

## When to reach for this skill

- A user or agent needs to connect a new external service (Slack, OpenAI,
  Postgres, a webhook, anything in the 400+ type catalogue).
- A tool call is failing because it can't find a credential, or is using the
  wrong one (check `is_default`, folders, agent assignments, and BYOK before
  assuming the vault itself is broken).
- An agent needs *time-boxed* access to something sensitive rather than a
  standing credential (`vault lease`).
- Something needs testing, rotating, or auditing: "is this API key still
  good", "who used this credential last week", "what's expiring soon".
- Don't reach for this to build a NEW executable connector (an
  `email_read`/`remote_ssh`-style tool that actually *uses* a stored
  credential type) — that's collector tool work in `agentTools.js`, this
  skill is the storage/governance layer underneath it. See Honest limits.

## Recipes

### 1. Connect a credential end to end (CLI, human path)

```bash
quox vault types                                   # browse the catalogue
quox vault create --type slack --label "Team Slack" \
  --credentials-file ./slack-creds.json --set-default
```
`slack-creds.json` is `{"field_key": "value"}` for the fields that type's
`typeDef.fields` declares, `chmod 0600` it, delete it after. Never pass
secrets as CLI flags: there is deliberately no `--value` flag, because
anything on argv lands in shell history and the process list. Two headless
options: `--credentials-file <path>` or `--credentials-stdin` (nothing
touches disk). Either supports `"env:VAR_NAME"` as a value, resolved at
runtime, so the secret itself need never be written down. Interactive mode
(`quox vault create` with no flags) prompts for type, label, and each field
if a TTY is attached; `--no-input` turns a missing field into a clear error
instead of a hang.

By default `create` offers a connection test right after saving. Skip it
with `--no-test` if the endpoint isn't reachable yet.

### 2. Pre-save test (verify before you commit)

```bash
quox vault test-new --type slack \
  --credentials-file ./slack-creds.json
```
Hits `POST /integrations/test-credentials`. Nothing is persisted either way,
so this is the right move when a user says "does this key even work" before
they've decided to store it.

### 3. Org default vs BYOK

```bash
quox vault set-default <credentialId>     # make it the type's org default
quox vault list --type openai             # see what's default today
```
A newly created credential is **not** auto-set as default even if it's the
first of its type (a deliberate choice: swapping which credential live
traffic uses shouldn't be a side effect of creation). `vault create` prints
a reminder if you skip `--set-default`. Separately, if an org enables
`keys.allow_user_byok`, a per-user key can outrank the org default for that
one user (`resolveProviderKey`'s scope order: user BYOK → org vault →
instance → env) — mention this when a user asks "why is MY key not being
used" and the org default looks fine.

### 4. Folders

```bash
quox vault folder create --name "Production APIs"
quox vault folder list
quox vault folder rename <folderId> --name "Prod APIs"
```
Max nesting depth 3 (`services/auth/db/integrations.js`). Deleting a folder
moves its credentials to no-folder, it never deletes the credentials.

### 5. Agent assignment (which credential an agent uses for a tool type)

```bash
quox vault assign --agent sentinel --credential <credentialId> \
  --tool-type slack_post --priority 10
quox vault assignments --agent sentinel
quox vault unassign <assignmentId>
```
Higher `--priority` wins when more than one assignment matches. This is the
layer to check first when an agent is reaching the wrong external account.

### 6. Leases: request, approve, deny, revoke

```bash
quox vault lease request --credential <id> --agent sentinel \
  --justification "posting the daily digest"
quox vault lease list --status pending
quox vault lease approve <leaseId> --duration 30      # minutes
quox vault lease deny <leaseId>
quox vault lease revoke <leaseId>                       # kill an active one now
```
A request creates a pending HITL inbox item; approving without `--duration`
is refused (a lease is time-boxed by design, never open-ended). **Read the
enforcement mode before promising this gates anything**: see Honest limits,
`advisory` (the default for every org) logs a missing lease but still
releases the secret.

### 7. Rotation and the expiring sweep

```bash
quox vault rotate <credentialId> --expires 2026-12-01
quox vault expiring --days 14
```
`rotate` prompts for new field values (it does not read `--credentials-file`
today) and re-tests by default; the credential's `key_preview` changes but
its id and any folder/assignment/lease pointing at it stay intact. Run
`expiring` on a schedule if a stream wants a "credentials about to lapse"
report; nothing calls it automatically yet.

### 8. Health check

```bash
quox vault stats                 # org health dashboard: healthy/failed/untested/stale
quox vault scan                  # lists actual issues, not just counts
quox vault test-all              # re-tests every stored credential sequentially
quox vault activity --limit 50   # the WARD-witnessed audit trail
QUOX_SERVICE_KEY=<INTERNAL_SERVICE_KEY> quox vault health   # service-key gated cross-org summary
```
`vault health` needs `QUOX_SERVICE_KEY` (or `QUOX_FORCE_SERVICE_KEY=1` if a
user session is also stored), it 401s a normal Bearer-token login by design.

## Agent tools (for Claude driving Quox via MCP, not the human CLI)

Four vault tools exist for an agent, all read-only or test-only, credential
*creation* stays human-only by design:

- `vault_list` — list an org's stored credentials (type, label, `is_default`), never values.
- `vault_test` — test-connect a stored credential by id, never echoes the value.
- `vault_types` — browse/search the type catalogue: id, name, category, whether it has a live test, the field names/labels (never a default value that could be mistaken for real).
- `vault_connect_guide` — given a type id, returns the field list, the dashboard path, and the matching `quox vault create` shape with placeholders. Composes public type metadata only, never sees or creates a credential.

Use `vault_types` + `vault_connect_guide` when a user asks an agent "help me
connect X": the agent can walk them through exactly what's needed, then the
human pastes the real secret themselves (dashboard Add Credential form or
their own terminal with `--credentials-file`). That split is deliberate, not
a gap to route around.

## Dashboard paths

`/vault` (health dashboard) · `/vault/browse` (catalogue) ·
`/vault/credentials` (connected list, builder role+) · `/vault/folders`
(builder role+) · `/vault/leases` (builder role+, includes the enforcement
mode banner) · `/vault/activity` (admin role only).

## Honest limits

Read `docs/STATUS_AND_LIMITS_VAULT.md` in quox-dashboard before promising any
of this in a customer conversation; it's more current and more honest than
this skill will ever be kept. Headlines, verified 2026-09-06:

- **A stored credential is not an executable integration.** 413 typed
  entries exist in the catalogue; the number of tools that actually *use* a
  stored credential to talk to something is closer to half a dozen
  (`email_read`/`email_send`, `remote_ssh`, `tls_cert_info`, `db_query`,
  `browser_login`). Saving a `cloud` (AWS/GCP/Azure)-kind credential works;
  nothing opens a session with it yet.
- **111 of 413 types are format-validate only**, no `testEndpoint` — saving
  one checks the shape of what you typed, not whether it's real.
- **QuoxFlow's `${cred.KEY}` wiring lives on branch `vault-integ`**, not
  merged/deployed. Don't tell a user workflow nodes can pull vault secrets
  today without checking which quoxflow build they're actually running.
- **Lease enforcement defaults to `advisory` for every org**, and there is
  no dedicated UI/API to flip it to `enforced` (only the generic org-settings
  `PATCH`). Advisory mode logs a missing lease but still releases the
  secret: don't imply a lease gate is preventive unless the org has been
  confirmed `enforced`.
- **The KEK is global, not per-org.** Tenant isolation on stored credentials
  is enforced at the application/route layer (org_id checks), not
  cryptographically. Accepted, documented, revisit only if a second real
  tenant or the standalone-vault product lands.
- **`powers-host` container credential injection bypasses the vault
  resolver/lease/audit chain entirely** (writes plaintext into container env
  vars). Known gap, tracked as VAULT-F5-ENVLEAK, not this skill's to fix.
- **The backend registry, the frontend field-widget UI, and any website copy
  describing integration types are generated from the same source and kept
  in sync by a build step.** Do not hand-edit a frontend or website copy of
  the type list independently, it will drift the next time the registry
  regenerates.

## Leave it better

If a recipe above disagrees with a live `quox vault --help` or the type
catalogue on your instance, trust the instance and fix this file in the same
session, don't just route around it. The audit that created this skill found
"connect an external service credential" owned by no sub-skill at all; if a
future gap surfaces here (a new `vault` subcommand, a changed enforcement
default, a newly wired `cloud` executor), that is exactly the kind of thing
that belongs folded back into this file rather than left for the next
session to rediscover.
