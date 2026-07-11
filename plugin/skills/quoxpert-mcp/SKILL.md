---
name: quoxpert-mcp
description: "Install and wield QuoxMCP — the Model Context Protocol server that
  bridges any Claude (Desktop, Code, Agent SDK) to a QuoxCORE collector's live
  RBAC-gated tool surface (139 tools as of last regen, 8 resources, 4 operational
  prompts). Load when the user wants Claude to directly drive Quox infrastructure
  from chat, or needs to connect/troubleshoot QuoxMCP itself."
argument-hint: "<task, e.g. 'connect QuoxMCP' or 'run a fleet health check' or 'tools: none'>"
metadata:
  quoxpert:
    source_repo: quoxmcp
    sources:
      - repo: quoxmcp
        path: README.md
      - repo: quoxmcp
        path: manifest.json
      - repo: quox-dashboard
        cmd: "curl -s -H 'x-service-key: $INTERNAL_SERVICE_KEY' http://localhost:9848/api/v1/tools/list?agent_id=quox"
      - repo: quox-dashboard
        cmd: "curl -s -H 'x-service-key: $INTERNAL_SERVICE_KEY' http://localhost:9848/api/v1/resources/list"
      - repo: quox-dashboard
        cmd: "curl -s -H 'x-service-key: $INTERNAL_SERVICE_KEY' http://localhost:9848/api/v1/prompts/list"
    generated_at: 2026-07-11
    quox_version: v4.2.0
---

# QuoxPert — QuoxMCP (Tool Surface)

## What this is

QuoxMCP is a thin STDIO protocol adapter. It bridges Claude (Desktop, Code, or
any Agent SDK app) to the QuoxCORE **collector** API. QuoxMCP holds **no tool
logic itself** — every `tools/call` becomes `POST /api/v1/tools/execute` against
the collector, which enforces RBAC, routes to real infrastructure (SSH bastion,
Docker, Proxmox, memory service, plugins…), and writes to the AEE audit trail.
Resources (`GET /api/v1/resources/list`) and operational prompts
(`GET /api/v1/prompts/list`) work the same way: QuoxMCP fetches them from the
collector at startup and re-registers them as native MCP resources/prompts.

```
Claude ── STDIO ──▶ QuoxMCP ── HTTP (x-service-key) ──▶ QuoxCORE collector :9848
                                                            │
                                                            ▼
                                          SSH bastion / Docker / Proxmox / memory /
                                          plugins — RBAC-gated per QUOX_AGENT_ID,
                                          logged to AEE audit trail
```

## When (not) to use this sub-skill

**Use it when:** the user wants Claude itself to run fleet/infra operations,
read live Quox context, or invoke an operational playbook from inside a chat
turn — or wants to install/connect/troubleshoot QuoxMCP.

**Don't use it for:**
- Scripted, bulk, or CI-driven operation of a Quox instance from a shell →
  `quoxpert-cli`.
- Understanding the envelope/chain shapes QuoxMCP's audit tools surface
  (`query_envelopes`, `list_evidence`) → `quoxpert-protocols` (this skill shows
  *how to call* those tools; the protocols skill explains *what the data means*).
- Building a new tool/plugin backend that QuoxMCP would later serve →
  `quoxpert-plugin-sdk`.
- General product concepts (agents, workflows, crystals) → `quoxpert-core`.

## Install & connect

Two paths, pick by client. **Never ask the user to paste a service key, org ID,
or user ID into the chat conversation** — these are secrets/identifiers that
belong in a config file or a native OS install dialog. Tell the user *where*
to find them; do not collect them yourself.

### Claude Desktop — `.mcpb` bundle (recommended)

Download `quoxmcp.mcpb` from `https://github.com/quoxai/quoxmcp/releases` and
double-click it. Claude Desktop opens a native install dialog. The real field
set, read from `quoxmcp/manifest.json`'s `user_config` (this is more complete
than the two-field table in quoxmcp's own README, which only documents the two
required-looking fields — the manifest is ground truth):

| Field | Required | What to enter |
|---|---|---|
| Collector URL | yes | Base URL of the QuoxCORE collector, e.g. `http://your-quox-host:9848` |
| Service Key | yes (sensitive) | `INTERNAL_SERVICE_KEY` from the QuoxCORE `.env` or dashboard settings |
| Organisation ID | yes | The user's org ID — find it in the dashboard profile |
| User ID | yes | The user's user ID — find it in the dashboard profile |
| Agent ID | no (default `quox`) | RBAC identity; `quox` = full tool set, specialist IDs (`sentinel`, `cipher`, `nova`…) get subsets |

Restart Claude Desktop; `quox` appears in the 🔌 tools menu. Verify by asking
Claude "run a fleet health check" — it should invoke the `fleet-health`
operational prompt.

### Claude Code / Agent SDK — manual `--mcp-config`

```json
{
  "mcpServers": {
    "quox-tools": {
      "command": "node",
      "args": ["/path/to/quoxmcp/server.js"],
      "env": {
        "QUOX_AGENT_ID": "quox",
        "QUOX_SESSION_ID": "",
        "QUOX_SERVICE_KEY": "your-service-key",
        "QUOX_COLLECTOR_URL": "http://127.0.0.1:9848",
        "QUOX_ORG_ID": "your-org-id",
        "QUOX_USER_ID": "your-user-id"
      }
    }
  }
}
```

`QUOX_SERVICE_KEY` (or its fallback `INTERNAL_SERVICE_KEY`) and the org/user IDs
live in the QuoxCORE `.env` on the collector host or the dashboard profile page
— point the user there, don't collect the values in chat.

Verify with a standalone run (live-verified transcript, 2026-07-11, against a
dev collector — your banner numbers will match your instance's live tool count,
not necessarily this skill's cached snapshot below):

```bash
QUOX_AGENT_ID=quox QUOX_COLLECTOR_URL=http://127.0.0.1:9848 timeout 5 node server.js
```
```
[QuoxMCP] Starting — agent=quox, collector=http://127.0.0.1:9848
[QuoxMCP] Fetched 139 tools for agent quox
[QuoxMCP] Registered 139 tools, 8 resources, 4 prompts for agent quox
[QuoxMCP] Connected — serving 139 tools, 8 resources, 4 prompts via STDIO
```

## Live tool surface
<!-- quoxpert:generated:start tool-surface -->
Queried live 2026-07-11 against a dev QuoxCORE collector (`quox_version: 4.2.0`)
via `GET /api/v1/tools/list`, `/api/v1/resources/list`, `/api/v1/prompts/list`.
Counts vary by deployment (plugins add tools) and by `agent_id` (RBAC) — treat
these as a representative snapshot, not a hard number.

| Surface | Count for `agent_id=quox` | Notes |
|---|---|---|
| Tools | **139** | Full orchestrator set. quoxmcp's shipped README/manifest advertise "130+"/"83+" as a point-in-time baseline — the collector's live catalog has grown past that; always trust a live `tools/list` over a doc. |
| Resources | **8** | `system-identity`, `agent-registry`, `tool-permissions`, `defcon-levels`, `fleet-topology`, `active-alerts`, `plugin-status`, `audit-history`. (quoxmcp's README documents only 5 of these — System Identity, Fleet Topology, Agent Capabilities, Service Status, Configuration — under different names; the live resource list above is ground truth as of this snapshot.) |
| Prompts | **4** | `fleet-health`, `security-sweep`, `deploy-check`, `defcon-assess` |

RBAC tool-count samples (live, same collector, different `agent_id`):

| `agent_id` | Tool count |
|---|---|
| `quox` (orchestrator) | 139 |
| `sentinel` (security) | 28 |
| `metrics` (monitoring) | 25 |

Representative tool families (from the live `quox` list — not exhaustive):
`delegate_to_agent`, `orchestrate_objective`, `create_workflow`/`execute_workflow`,
`list_approvals`/`approve_request`/`deny_request`, `query_envelopes`,
`get_envelope_chain`, `list_evidence`, `ssh_exec`, `fleet_status`, `docker_status`,
`proxmox_vms`, `security_audit`, `metrics_query`, `memory_save`/`memory_search`,
`skills_list`, `alerts_manage`, `network_check`, `email_read`/`email_send`.
<!-- quoxpert:generated:end tool-surface -->

## Recipes (hand-authored, the actual expertise)

### 1. Register QuoxMCP in a client
See "Install & connect" above — `.mcpb` for Desktop, `--mcp-config` for Code/SDK.
After registering, confirm the connection: in Desktop click the 🔌 icon and
check `quox` is listed; in Code, ask "what MCP tools do you have?" and look for
`quox`-prefixed names.

### 2. List available tools
QuoxMCP fetches the catalog once at startup — Claude's own tool list *is* the
result of `tools/list`. To see the same data outside a Claude session (useful
for debugging what the collector will serve *before* wiring the client):
```bash
curl -s -H "x-service-key: $INTERNAL_SERVICE_KEY" \
  "http://<collector-host>:9848/api/v1/tools/list?agent_id=quox" | jq '.tools | length'
```
Live-verified: returns `139` against the dev collector at time of authoring.

### 3. Execute a representative tool
From Claude, just ask — e.g. "check fleet status." Under the hood this becomes:
```
POST /api/v1/tools/execute
{"tool_name":"fleet_status","input":{},"agent_id":"quox","session_id":"..."}
```
Note the field is `tool_name`, not `name` — a raw `curl` reproducing this call
with `"name"` instead fails with `{"success":false,"error":"tool_name is required"}`
(live-verified). See Gotchas for the org/user scoping requirement that also
applies to raw calls.

### 4. Read a resource
Resources are cheap context — no tool execution, no audit-trail write. Ask
Claude "what's the fleet topology?" or "what's your system identity?" — it
reads `quox://fleet/topology` or `quox://system/identity` directly. Check
`fleet-topology` **before** any host-touching op; it's the cheapest way to
confirm a hostname/role before spending a tool call on it.

### 5. Use an operational prompt
Ask "run a fleet health check," "do a security sweep," "check deploy health on
docker01," or "what DEFCON level is [operation]?" — these map 1:1 to the four
registered prompts (`fleet-health`, `security-sweep`, `deploy-check`,
`defcon-assess`). Each is a mustache-templated instruction to Claude that names
the exact tools to call and the report structure to produce — Claude doesn't
need to improvise the playbook.

### 6. Per-user MCP token / identity issuance
QuoxMCP doesn't issue its own tokens — it forwards `QUOX_SERVICE_KEY` (a
deployment-wide service key) plus `QUOX_ORG_ID`/`QUOX_USER_ID` (per-user
identifiers) on every collector request. All three live in the user's
QuoxCORE `.env` or dashboard profile. There is no separate "MCP token" to mint;
attribution in the audit trail comes from the org/user IDs in the MCP config,
not from a per-session credential.

### 7. Troubleshoot "tools: none" / empty tool list
Root causes, in order of likelihood:
1. **Collector unreachable** — `QUOX_COLLECTOR_URL` wrong or collector down.
   Check `~/Library/Logs/Claude/mcp-server-quoxmcp.log` (macOS) or
   `%APPDATA%\Claude\Logs\` (Windows) for a connection error at startup.
2. **Service key rejected** — wrong or missing `QUOX_SERVICE_KEY`/`INTERNAL_SERVICE_KEY`.
   The collector returns 401 before QuoxMCP ever sees a tool list.
3. **`agent_id` has zero tool assignments** — a custom/specialist `agent_id`
   with no RBAC grants returns an empty array validly, not an error. Compare
   against `agent_id=quox` to confirm the collector itself is healthy.

### 8. Understand RBAC tool subsets
The orchestrator (`agent_id=quox`) sees the full set; specialists see fewer —
e.g. `sentinel` (security) sees 28 tools, `metrics` (monitoring) sees 25, both
live-verified against the same collector that serves 139 to `quox`. If a tool
call 403s, that's the RBAC gate working as intended — explain the boundary
("that tool isn't granted to this agent identity") rather than treating it as
a bug to route around.

### 9. Bridge into the audit trail (→ quoxpert-protocols)
`query_envelopes`, `get_envelope_chain`, and `list_evidence` are QuoxMCP tools
that read the AEE/VOLT audit trail directly from chat — no CLI needed. Ask
"what did workflow X do?" or "trace envelope `<id>`'s causality chain" and
Claude calls these tools. For the *shape* of what comes back (envelope fields,
evidence bundle structure) load `quoxpert-protocols`.

### 10. Delegate to a specialist agent
`delegate_to_agent` lets the orchestrator hand a sub-task to a specialist
(`sentinel`, `cipher`, `nova`, `atlas`, `metrics`, `beacon`, `scholar`, `forge`,
`prism`, `insight`, `corey`, `tester`, or any custom agent ID) without the user
needing to know which agent owns which domain — Claude picks based on the task
description passed in the `task` argument.

### 11. Remote/fleet host install
QuoxMCP can run alongside QuoxAgent on any fleet host:
```bash
cd /path/to/quoxmcp/deploy && ./bundle.sh          # build the tarball
cd /path/to/quoxagent/deploy
./deploy-to-host.sh <host>                          # or: all
./deploy-to-host.sh all --check-mcp                 # verify
```
Remote config lands at `/etc/quoxmcp/mcp-config.json` (chmod 600); Claude CLI
on that host connects with `claude --mcp-config /etc/quoxmcp/mcp-config.json`.

### 12. Choose MCP vs CLI vs dashboard
One-shot reads and interactive fleet ops from a chat turn → MCP tools (this
skill). Scripted, bulk, or CI-driven operation → `quoxpert-cli`. Anything
visual or requiring an approval click-through → hand the user the dashboard
URL and describe what they'll see. Governance expectations carry across all
three: destructive/ambiguous ops route to HITL and return `pending_approval`,
not a failure — poll rather than retry blindly.

## Gotchas

- **Never collect secrets in chat.** Service key, org ID, user ID go in the
  `.mcpb` install dialog or a config file — never a conversation turn.
- **`tools/execute` needs org/user scoping even with a valid service key.**
  Live-verified: a raw `POST /api/v1/tools/execute` with a correct service key
  but no `org_id`/`user_id` returns
  `{"success":false,"error":"org_id and user_id are required for service-key authenticated MCP calls"}`.
  This is why the `.mcpb` manifest requires those two fields even though
  quoxmcp's README's quickstart table only mentions two.
- **Docs vs live counts drift.** quoxmcp's README says "130+ tools, 5
  resources"; the manifest description says "130+ tools, 5 resources, 4
  prompts." Live query at authoring time returned 139 tools and 8 resources.
  Always trust a live `tools/list`/`resources/list` over a static doc — the
  collector's catalog grows as plugins/tools are added.
- **A 403 is RBAC working, not a bug.** Explain the agent-identity boundary
  instead of suggesting the user switch to a more privileged `agent_id` as a
  workaround.
- **Resources cache for 30s.** A resource read right after an infra change may
  show stale data for up to 30 seconds — mention this if a user reports a
  resource "not updating."
- **HITL approval returns `pending_approval`, not an error.** Poll for
  resolution rather than retrying the same tool call.
- **The `.mcpb` bundle is unsigned** — macOS shows "unverified developer" on
  first install; right-click → Open to bypass. This is expected, not a red flag.
