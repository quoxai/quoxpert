---
name: quoxpert-bastion
description: "Operate QuoxBastion (the SSH-governed fleet command layer) and
  the quoxagent per-host sidecar via the quox CLI's `fleet` command group:
  host inventory, governed SSH execution, tools registry, agent deploy, fleet
  health, and HITL approval for risky commands. Load when the user wants to
  inspect, deploy to, or run commands against Quox-managed hosts."
argument-hint: "<task, e.g. 'list fleet hosts' or 'deploy quoxagent to a new host'>"
metadata:
  quoxpert:
    source_repo: QuoxBastion (Go) + quoxagent (Go) + quox-dashboard (cli/, collector)
    sources:
      - repo: QuoxBastion
        path: README.md
      - repo: QuoxBastion
        path: CODEBASE_MAP.md
      - repo: quoxagent
        path: CODEBASE_MAP.md
      - repo: quox-dashboard
        path: docs/STATUS_AND_LIMITS_COLLECTOR_AUTH.md
      - repo: quox-dashboard
        cmd: "node cli/bin/quox.js fleet --help"
      - repo: quox-dashboard
        path: "services/collector/server.js (GET /install, GET /download/quoxagent-:os-:arch)"
    generated_at: 2026-07-25
    quox_version: ">=0.1 pre-1.0"
    maturity_note: "quoxagent heartbeat auth is Beta"
---

# Quoxpert: QuoxBastion & Fleet (quoxagent)

## What this is

Two Go binaries work together to give Quox governed control of a fleet of
hosts:

- **QuoxBastion** is the source of truth for host inventory, SSH execution,
  and a 9-tool built-in registry (health-check, ssh-key-deploy, sudo-setup,
  motd-set, install-npm, install-claude, install-prometheus,
  install-quoxagent, cert-check), plus user-defined "Bastion Packs." It has
  its own REST API, CLI, and a full-screen BubbleTea TUI, but from Quox
  proper you drive it through the collector's `quox fleet` command group.
- **quoxagent** is a lightweight per-host sidecar (~32 MB RAM) that runs on
  each managed host: agent session monitoring, sandboxed job execution
  (Ed25519-signed), heartbeat/metrics push, a playbook engine, and a plugin
  system (core/noc/soc/mikrotik/codebase; NOC is free, SOC is Tier A+).

Governance matters here: SSH execution and destructive tools route through
the same HITL approval path as everything else in Quox. The bastion doesn't
give Claude (or a human) a side-channel around approvals.

## When (not) to use this sub-skill

Use this when the user wants to: see what hosts are under management, run a
governed command/tool against one or more hosts, deploy the quoxagent
sidecar to a new host, check fleet health, or understand the approval flow
for a risky fleet operation.

**Do NOT use this for:**
- General CLI operations unrelated to the fleet (workflows, plugins,
  billing) → the CLI-wide skill.
- Building/extending a Quox plugin (including a fleet-management-template
  plugin) → the plugin-SDK skill.
- Anything that requires SSH'ing directly into hosts yourself, bypassing
  QuoxBastion's audit trail: that defeats the point. Route through
  `quox fleet exec`, not raw `ssh`.

## Install & connect

QuoxBastion and quoxagent are separate downloads from QuoxCORE. Install them
on the hosts you want to manage, then point them at your collector. Neither
step requires pasting a secret into chat: quoxagent's public bootstrap script
deliberately does NOT embed a service key (it's unauthenticated by design;
credential provisioning happens over the authenticated deploy path
afterward, not through the install script).

    npm install -g quoxcli
    quox login
    quox fleet status                 # confirms the collector can see your fleet

**Enroll a new host** (run this ON the target host, as root/sudo):

    curl -sSL https://<your-collector-host>:9848/install | sudo bash -s -- --host-id $(hostname)

This installs the quoxagent binary and registers it with your collector.
Credential/scoped-key provisioning for the heartbeat happens over the
authenticated deploy path. Never ask a user to paste `AGENT_SERVICE_KEY` (or
any other secret) into chat; point them at their instance's fleet deploy
tooling instead.

## Command map
<!-- quoxpert:generated:start command-map -->
| Command | Purpose |
|---|---|
| `quox fleet status` | Show fleet status |
| `quox fleet summary` | Show fleet summary |
| `quox fleet agents` | List fleet agents (quoxagent instances) |
| `quox fleet tools` | List available fleet tools (bastion's built-in + pack tools) |
| `quox fleet exec --tool <name> [--host <hostId>] [--input <json>]` | Execute a governed fleet tool |
| `quox fleet watch` | Watch fleet status in real time |
<!-- quoxpert:generated:end command-map -->

## Recipes (hand-authored: the actual expertise)

### 1. See what's in the fleet
    quox fleet status
    quox fleet summary
    quox fleet agents

### 2. List available tools before running one
    quox fleet tools
    # → health-check, ssh-key-deploy, sudo-setup, motd-set, install-npm,
    #   install-claude, install-prometheus, install-quoxagent, cert-check,
    #   plus any org-defined Bastion Packs   # (representative)

### 3. Run a health check against one host
    quox fleet exec --tool health-check --host docker01

### 4. Run a tool across a group (bastion-side grouping)
    quox fleet exec --tool cert-check --host docker01 --input '{"domains":["quox.ai"]}'

### 5. Watch the fleet in real time while you make a change
    quox fleet watch

### 6. Enroll a new host (see Install & connect above)
    curl -sSL https://<your-collector-host>:9848/install | sudo bash -s -- --host-id newhost01
    quox fleet agents        # confirm it registered

### 7. Deploy the quoxagent SSH key to a host you already manage
    quox fleet exec --tool ssh-key-deploy --host newhost01

### 8. Check certificate expiry across the fleet before it bites you
    quox fleet exec --tool cert-check --host newhost01

### 9. A risky/destructive tool run pauses for approval (HITL)
Tools flagged as destructive (or any run against `--host all`/a whole group,
depending on your instance's policy) create a pending inbox item instead of
executing immediately:

    quox fleet exec --tool sudo-setup --host newhost01
    quox inbox list --status pending
    quox inbox respond <itemId> --action approve --comment "verified with owner"

## Gotchas

- **There is no top-level `quox bastion` command**: everything routes
  through `quox fleet`. Bastion's own native CLI/TUI (`bastion host list`,
  `bastion exec`, `bastion tui`) is a separate binary meant for direct
  operators on the bastion box itself, not the day-to-day Quox-user path.
- **`/install` never carries a service key, and never should.** If a fleet
  enrollment flow ever asks you to paste a secret into chat to finish
  enrolling a host, that's wrong: stop and point the user at their
  instance's authenticated deploy tooling instead.
- **Heartbeat auth is Beta ("belt open") on many instances as of this
  writing.** A scoped `AGENT_SERVICE_KEY` is accepted on the heartbeat
  route, but some instances haven't flipped enforcement on yet. Don't be
  surprised if `quox fleet agents` shows hosts heartbeating without a key on
  an instance that hasn't completed its fleet-auth rollout: that's an
  in-progress hardening step, not a bug you need to fix from chat.
- **`quox fleet exec` is the audited path: raw SSH is not.** Any recipe
  that has Claude run `ssh host "command"` directly, bypassing the fleet
  tool registry, loses the audit trail this whole system exists to provide.
- **quoxagent plugins are tiered**: NOC is free, SOC needs Tier A+
  licensing. `quox fleet tools` will show what's actually available on a
  given instance; don't assume every plugin's tools exist everywhere.
