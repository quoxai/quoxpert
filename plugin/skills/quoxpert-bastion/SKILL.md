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
license: LicenseRef-SkillRights-Reserved-1.0
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
sidecar to a new host, check fleet health (the command is `quox fleet status`,
NOT `quox fleet health` which does not exist), or understand the approval flow
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
| `quox fleet hosts` | List hosts known to the Bastion registry |
| `quox fleet gpu` | List the durable GPU fleet |
| `quox fleet tools` | List available fleet tools (bastion's built-in + pack tools) |
| `quox fleet exec --tool <name> [--host <hostId>] [--input <json>]` | Execute a governed fleet tool |
| `quox fleet exec ... --reason "<why>" [--session-label <name>]` | Same, and if the call is held for approval the card shows Source/Reason/Method (HITL-CONTEXT). Always pass `--reason`; export `QUOX_SESSION=<session name>` so the card names your session. Agents pass `_reason` in tool input. Ships with dashboard commit 91d339805 (not deployed until the collector + CLI are rebuilt) |
| `quox fleet host-update <hostId> [options]` | Update a host in the Bastion registry (link/clear bootstrap credential) |
| `quox fleet codex-provision <hostId>` | Provision Codex on a fleet host (npm install, AppArmor userns profile, model config) up to the manual device-auth login |
| `quox fleet rehome-agent <hostId> --collector <url> --org <orgId>` | Re-enrol a host's QuoxAgent against a different collector by clean reinstall |
| `quox fleet enrol <host> [--os linux --arch amd64\|arm64] [--run]` | Print (or run) the command that enrols a host; probes `GET /install` first. Public images serve a SIGNED quoxagent release baked at `/app/quoxagent-release` (quox 4da82fb53). GOTCHA 2026-10-17: on a default public install (self-signed :3000) the printed `curl https://...:3000/install \| sudo bash` dies with curl (60) and the pipe still exits 0 (#1223). Working path: `curl -fsSL -o /tmp/i.sh http://<A>:9848/install`, `sha256sum -c` it against the release manifest, `sudo BINARY_SHA256=<pin> bash /tmp/i.sh --host-id <id> --collector http://<A>:9848`. `fleet hosts` 503s with no Bastion (public installs ship none, #1224): use `quox fleet agents` to see heartbeating hosts. |
| `quox fleet watch` | Watch fleet status in real time |
<!-- quoxpert:generated:end command-map -->
<!-- fleet #446 (2026-08-26): rows above updated BY HAND against the live
     `quox fleet --help`; the quoxpert regen pipeline does not cover this
     skill yet (quox#433), so regen will not clobber this, and when it
     finally does cover it, the generator output should match or supersede
     these rows. -->

## Recipes (hand-authored: the actual expertise)

### 1. See what's in the fleet
    quox fleet status
    quox fleet summary
    quox fleet agents

> **Read this before recipes 3, 4, 7 and 8 (verified 2026-10-14, quoxbastion#20):** Bastion's
> BUILT-IN tools (health-check, cert-check, ssh-key-deploy, ...) are NOT reachable through
> `quox fleet exec` today: the call returns `unknownTool` or `hatDenied not_granted` (see the first
> Gotcha, quox#459). Those recipes show the intended shape, not a working path. What works now:
> `quox fleet exec --tool ssh_exec --input '{"host":"<id>","command":"..."}'` from a HUMAN profile
> (`-p moo`), with sudo commands going through an approval.

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

### 10. A governed SECURITY-engagement scan grants itself a bastion approval — NO inbox item (by design)
A governed `quox engagement` scan that reaches a host through a `mode:risky`
bastion does NOT create a pending inbox item for `discovery`/`safe_active`
tools, and that is CORRECT, not a missing approval. The collector mints a
short-TTL Ed25519 **X-Bastion-Approval-Grant** anchored to the ACTIVE
engagement (verified target + tool risk ≤ the engagement's ceiling + within its
time window), scoped to the exact command+host, and the bastion accepts that
grant. The engagement IS the human authorization: a human created it,
DNS/well-known-verified the target, and set the risk ceiling. So "no pending
inbox item was created" is the expected shape for discovery/safe_active scans.
An inbox item (recipe 9) is raised ONLY for `intrusive`+ tools
(`requiresApprovalForRisk` fires at `>= intrusive`). Proven live 2026-09-27:
3 real production sites scanned through a mode:risky bastion this way (#626).
- **The rough edge (griped to VULCAN 2026-09-27, c11b923e):** the collector-side
  `check-policy` callback that gates the mint has a **10s timeout that
  fail-closes to a 409** when the collector is under load
  (`collector check-policy error: operation aborted due to timeout`). Fail-closed
  is right; the tight timeout is not — a warm retry usually succeeds. If a first
  scan 409s on a loaded box, it is this, not a real deny.
- **No `remove-target`/`set-verification-method` verb** (also griped): a target
  added with the wrong verification method is stranded; you must create a fresh
  engagement to re-verify it by another method.

## Gotchas

- **Bastion BUILT-IN tools are NOT actually reachable via `quox fleet exec`
  (as of 2026-08-22).** Recipes above show `--tool health-check`,
  `--tool install-quoxagent` etc., but the collector tool registry returns
  `Unknown tool: install-quoxagent` for every bastion built-in; only the
  collector's own tools (ssh_exec, fleet_status, ...) resolve. Filed as
  quoxai/quox#459. Until fixed, the working governed path for "install/
  reinstall quoxagent on host X" is the collector's install script run ON
  the host via ssh_exec, detached to dodge the 60s exec cap:
  `sudo systemd-run --collect --unit=quoxagent-reinstall bash -c "curl -sSL http://<collector>:9848/install | bash -s -- --host-id <hostId> > /tmp/quoxagent-install.log 2>&1; echo EXIT:$? >> /tmp/quoxagent-install.log"`
  then poll the log with short ssh_execs. Verified live on
  <client-site> 2026-08-22.

- **`quox fleet rehome-agent` --org shadowing is FIXED** (quoxai/quox#457,
  commit b9262af4 on origin/main, 2026-08-22): the flag now parses in any
  position and validation happens in the action. The ssh_exec + /install
  fallback above remains useful when the collector cannot reach the host's
  agent at all.

- **`quox fleet hosts` now lists the bastion HOST registry, but the fleet
  counts still disagree across surfaces.** `quox fleet agents` = heartbeating quoxagents only (a host can
  be up and enrolled in bastion yet absent here if its agent or the VM is
  down). `quox fleet summary`'s Total counts something else again. The
  actual registry lives in bastion; read it with ssh_exec on the
  bastion host via the AUTHENTICATED API (unauthenticated curl returns
  `{"error":"unauthorized"}` since the security hardening; verified
  2026-08-31). Extract a token in place, never printing it:
  `TOKF=$(grep -oP 'token_file: *\K\S+' /home/ubuntu/bastion.yaml); curl -s -H "Authorization: Bearer $(python3 -c "import json;print(json.load(open('$TOKF'))['tokens'][0]['token'])")" http://localhost:9850/api/v1/hosts`. quoxai/quox#460 (a proper `quox fleet hosts` verb) SHIPPED:
  verified live 2026-08-26, the verb lists the bastion registry.
  Two more traps while you are in there: bastion's status sweep can be
  frozen for hours with `Stale 0` still reported and never-seen hosts
  rendered as year `0001` (quoxai/quoxbastion#8), and the native
  `bastion` CLI lives at `~/go/bin/bastion` on the bastion box (NOT
  /usr/local/bin) and prints a misleading `No hosts registered` when it
  simply has no API config in a no-profile shell (quoxai/quoxbastion#9).
  A bastion row saying `unreachable` is a claim about the last sweep, not
  about now: ping/ssh before believing it.
  **CORRECTION (2026-10-19): there is NO background sweep at all.** Bastion
  only writes state/health/last_seen inside `pingHost` (internal/api/server.go),
  i.e. when something calls `GET|POST /api/v1/ping` (the dashboard Bastion /
  Fleet Connectivity panels, agent startupQueries). An unreachable result sets
  last_seen to ZERO, so it renders `never`. Every row stuck at one timestamp
  (2026-09-30T21:27:10Z here) = nobody has pinged since, not a dead daemon.
  The collector's `fleet hosts` is a live passthrough to BASTION_URL, no cache.

- **Version / presence probes run with NO approval card (2026-10-19, dashboard 3b3cafcb3).** The shared
  fleet-read allowlist (`services/shared/fleetReadAllowlist.cjs`) now passes EXACT shapes:
  `<bin> --version` for claude/codex/gemini/node/npm/git/docker/python3, `command -v <name>`,
  `which [-a] <name>`, `docker exec [-u <user>] <container> <bin> --version`. One command per call,
  NO `&&`/`;`/pipes (any metachar = not a read = HITL card). An absolute path (`/usr/bin/claude --version`)
  is not allowlisted. A chat turn the classifier marks no_shell (a Docker/network/security READ ask)
  still runs these; anything else on that turn is dropped. Proven live: 174 probes on 58 hosts, 0 cards.
  Gotcha: running ~6 in parallel trips `Too many tool calls`; 3 workers + retry is fine.
- **ssh_exec `hosts: [...]` (multi-host, ≤25, ONE command, ONE card) works since 2026-10-19 (quox#1295, dashboard b1d8e208a).**
  Before that every host read `no result returned by bastion for this host`: bastion's raw `/api/v1/exec` stamps each
  result's `host_id` with the DIALLED IP (results stay in target order), and the collector matched by fleet id only. The
  collector now matches by id, then cached IP, then position. Proven live: `claude --version` on <hypervisor>/<hypervisor>/<bastion-host>
  returned three correct per-host results. Use it to batch reads and to put one change across a group on ONE card.
- **ssh_exec `duration_ms` in results is garbage** (141 hours for a
  sub-second command); ignore it (quoxai/quoxbastion#10).

- **`quox fleet exec --tool ssh_exec` 400s `invalid agent_id: unknown agent
  in JWT claim` when your CLI session is an ATTACHED/RESIDENT agent identity**
  (not a human) — seen 2026-09-26 as the <dev-box> resident (attached
  `quartermaster`). `quox fleet agents`/`hosts` (reads) still work; it's the
  exec path that rejects the agent-claim JWT. Fixes: run from a human profile
  (`quox login` / `-p <human>`), or when you're inside the collector, use the
  collector's own governed callBastion path with a minted approval grant rather
  than the CLI. Gripe filed (CLI-usability). Don't misread it as "the host is
  unreachable" — it's an identity/authz mismatch, not connectivity.

- **On <dev-box> the DEFAULT `quox` profile is the RESIDENT agent**
  (`quox whoami` shows `Actor Type agent`), so `quox fleet exec --tool
  ssh_exec` returns `hatDenied: not_granted` (QuoxHat default hat). Seen
  2026-10-12. Run human-initiated fleet work as the owner profile:
  `quox -p moo fleet exec ...` (it then goes to the approvals inbox as
  normal). **Put the host INSIDE `--input` (`{"host":"<hypervisor>","command":...}`)**:
  `--host` goes to a separate body field that ssh_exec ignores, so the
  approval is created, approved, then FAILS with `targets: [null]` (quox#789).
  Batch a multi-step host job into ONE detached script
  (`systemd-run` + log file) so the owner approves once, not per step.

- **Fleet STANDING GRANTS (built 2026-10-13, branch `session/quox-standing-grant` 12a6a6ede, NOT deployed until merged + collector AND auth rebuilt).** For a scoped lane the owner pre-approved (e.g. a throwaway test-VM range), a human org admin creates `quox -p moo approvals grants create --host <hostId> --preset proxmox-test-vm-lane --template <tplVmid> --vmid-range 9100-9199 --name-prefix z2h --days 14 --reason "..."`; list/revoke with `quox approvals grants list [--all]` / `revoke <id>`. A covered ssh_exec skips HITL, still writes an `approved` tool_approvals row (id `SG_...`, readable with `quox approvals result`) + an AEE envelope per use, and mints its bastion grant via auth `mint-standing` (fails closed). Covered shapes are anchored regexes: single commands only (`qm start 9101`, never `a; b`), guest payloads only as `qm guest exec <id> [--timeout N] -- bash -c '<no single quote inside>'`, long jobs via `systemd-run --collect --unit z2h-<x> qm ...`. Anything else files HITL as before. Before it is deployed: batch the whole host job into ONE detached script so the owner approves once, plus one read.
- **HYPERION VM POOL (2026-10-14): need a throwaway VM? Ask on the slot: `quox slot say provisioner "VM please 4c 8G 40G for <purpose>" --session <you>`, then "done <vmid>".** Only the HYPERION session can run `~/bin/quox-vmpool` (the atlas attach token is bound to its Claude process). <hypervisor>, template 3630, VMIDs 9200-9299, standing grant `SGR_50382ed32d17c41e2ae8` (expires 2026-11-13), every op witnessed as agent `atlas`. Gotchas it already handles, learned building it: **<hypervisor> has no AES CPU flag** (golden template default `x86-64-v2-AES` dies with "QEMU exited with code 1"; set `--cpu host`); **clones of a golden image share `/etc/machine-id`, so DHCP hands every clone the SAME IP** (regen machine-id + `ssh-keygen -A` + `netplan apply`); the golden is **LVM**, so `growpart` alone leaves `/` at 10G (also `pvresize` + `lvextend -r`); **<hypervisor> has ~26GB RAM free, <hypervisor>/<hypervisor> ~180GB**, size from Prometheus `node_memory_MemAvailable_bytes` at <monitoring-host>:9090; a standing-grant call can fail transiently with "approval grant mint failed", so retry it (never re-approve).
- **HYPERION's native `proxmox_*` read tools ALWAYS refuse (403 approval_required, no card)** (2026-10-14): they run `pvesh` through raw Bastion exec, which `RiskForExec()` classes risky, and they never pass a grant. Use `ssh_exec` inside a standing grant (`qm list`, `qm config`) until a safe Bastion builtin for pvesh reads ships. Also `quox fleet exec --tool health-check` is NOT reachable from the CLI hat (`unknownTool`, `not_granted`), so recipes using it are stale.
- **Do not stand up a listener on <dev-box> to feed a VM** (an http.server for an installer or a log callback): the auto-mode classifier blocks it ("Expose Local Services"). Embed small payloads base64 inside the one approved ssh_exec instead, and serve them on the VM's own loopback if a tool needs a URL.
- **Reading an approved ssh_exec's OUTPUT (2026-10-12):** the CLI cannot fetch it (re-invoke with `_approvalId` says pending). Read it from the collector's AEE DB: `docker exec quox-collector node -e "const D=require('better-sqlite3');const db=new D(process.env.AEE_DB_PATH||'/var/lib/quox/aee.db',{readonly:true});console.log(db.prepare('SELECT status,result_json FROM tool_approvals WHERE approval_id=?').get('<id>'))"`. Gripe filed. For long host jobs, write a log on the host and read it once at the end, to save approvals.

- **An APPROVED `ssh_exec` has already run: do NOT re-run it; READ it: `quox approvals result <approvalId>`** (shipped 2026-10-12, quox#791; also returned when re-invoking with `_approvalId`). History below (verified
  2026-10-07). When the owner approves the inbox item, the collector's resume
  executor (toolResume.js) runs the stored input itself and saves the output
  in `tool_approvals.result_json`. The CLI's instruction to "re-invoke with
  `_approvalId`" is wrong: re-invoking with `_approvalId` in `--input` comes
  back "still pending", and re-running the same input mints a SECOND
  approval. There is no CLI verb to read the result (gripe filed). Dev-box
  workaround, read-only:
  `docker exec -w /app quox-collector node -e 'const D=require("better-sqlite3");const db=new D("/var/lib/quox/aee.db",{readonly:true});console.log(JSON.parse(db.prepare("select result_json from tool_approvals where approval_id=?").get("<approvalId>").result_json).stdout)'`
  Also: the `resident` profile's hat lacks `ssh_exec` (`not_granted`), so
  exec needs a human profile (`quox -p moo`) and `sudo` commands need an approval.

- **The 60s exec cap counts YOUR sleeps** (verified 2026-10-07): an approved ssh_exec that includes `sleep 45` or a wait-loop aborts with `The operation was aborted due to timeout`, and you get NO stdout even if work completed. Launch long work detached (`sudo -n systemd-run --collect --unit=<name> bash -c '...' `), return immediately, read results in a separate short exec. Every retry is another owner approval, so batch reads per host into one exec.
- **A timed-out exec is NOT a killed exec** (DRAGONSHIELD 2026-10-23): the card records `error: aborted due to timeout`, but the remote shell keeps running (seen stuck in `apt-get update`, then free to install + restart apache with nobody watching). Before re-filing, do a read-only state check (`ps -eo pid,etimes,args`, `dpkg --audit`, versions). For package upgrades or restarts, go STRAIGHT to `systemd-run` + a log file; never run them inline.
- **Never `pgrep -f`/`pkill -f` a pattern that also appears in your own ssh_exec command line**: it matches the exec's own `bash -c` shell, so you kill yourself mid-card (DRAGONSHIELD 2026-10-23: `kill: No such process`, and the relaunch never happened). Match by exact name (`pgrep -x apt-get`) or by a PID you read in an earlier card.
- **`quox approvals result` shows no approver identity** (only status + executed_at), so "who approved this?" cannot be answered from the CLI; ask the collector side or the human (DS-009, 2026-10-23).
- **Running `claude -p` on a fleet host:** a `--allowedTools "Write(/path)"` rule does NOT match file writes (path rules use `Edit(/path)`), so the run ends asking for permission and writes nothing; pass `--model` explicitly (the host default may be unavailable, e.g. `fable`), add `--disallowedTools Task Agent` so the final message is the answer, and redirect stdout to a file you fetch later.

- **`ssh_exec` host (FIXED 2026-10-12, quox#789): `--host` is now merged into `input.host`, and a hostless gated ssh_exec is refused with 400 BEFORE an approval is created.** History: Verified
  live 2026-08-22: `--host <agent-host>` reached the bastion as an
  EMPTY host ("host not found: "), while
  `--input '{"host":"<agent-host>","command":"..."}'` executed. The
  `--host` flag works for bastion built-ins (health-check etc.); ssh_exec
  reads its own input schema. Also: ssh_exec lands in `$HOME` with no
  profile, so use absolute paths, and chain with `;` when a probe may fail
  (`&&` silently truncates your diagnostics).

- **Adding a NEW host to the registry has NO `quox fleet` verb** (2026-08-31,
  <dev-box> birth): `host-update` only links credentials; it cannot create.
  The working governed path is POST `/api/v1/hosts` on the bastion box with a
  Bearer token (see the token-extraction pattern above), body
  `{"id":"<hostId>","ip":"<ip>","group":"fleet","ssh":{"port":22,"user":"control"}}`
  (group `fleet`, user `control` is the dev-box convention). PUT
  `/api/v1/hosts/<id>` updates (e.g. an IP change). DELETE
  `/api/v1/hosts/<id>` removes a stale row (HTTP 200; verified 2026-10-08
  removing repurposed security-onion01). GET the row to a backup file first so
  it can be re-POSTed. Repurposed VMs leave the OLD row behind with the same
  IP: when two rows share an IP, check `hostname` on the box before trusting
  either. Do NOT use
  `bastion host add` (direct storage write) while the daemon runs: the daemon
  loads hosts.json into memory ONCE at serve start, so a file write is
  invisible until restart and a later daemon save can clobber it. Filed as a
  product gap: the quox CLI has no fleet verb to add a host yet.
- **`quox dev enable` has TWO hidden prerequisites beyond a heartbeating
  agent** (each produced a distinct 502, 2026-08-31): the host must be in the
  BASTION registry (`502 Bastion returned 404: host not found`) AND the SSH
  user needs passwordless sudo (`502 sudo: a terminal is required`;
  fix: `echo 'control ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/control-nopasswd`,
  chmod 440). Birth order that works: enroll quoxagent -> POST bastion host
  row -> NOPASSWD sudoers -> `quox dev enable`.
- **ssh_exec on <bastion-host> lands as user `ubuntu`, not root.** `/root/...`
  paths are permission denied; the serving binary is
  `/home/ubuntu/QuoxBastion/bastion --config /home/ubuntu/bastion.yaml`.
  Also `bash -lc` there hangs silently; never wrap commands in a login shell.
- **There is no top-level bastion command in quox**: everything routes
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
- **ALWAYS pass `--reason` and set `QUOX_SESSION` on approval-gated execs
  (`ssh_exec`, `remote_ssh`, `db_query`, `email_send`, and the rest of the
  always-propose set); the human sees both on the approval card.** Works on
  `quox fleet exec --tool ... --reason "why"` and `quox tool exec <name>
  --reason "why"`. Without them the card shows a bare user id and "Reason:
  none given" (a real item was approved blind on 2026-10-07). The CLI now
  guesses the source (attached agent, held slot, parent process) and warns on
  stderr when `--reason` is missing, but a guess is not your session name:
  `export QUOX_SESSION=<session name>` at session start.

<!-- >>> tips (generated by sync-quoxpert-tips; do not edit) >>> -->
## Tips users see

Quox shows these one-line tips to users (`quox tips`). Know them so you can point at the right command.

- **Give AIs access to any host**: `quox fleet hosts` (beta; shows when: fleet)
- **Add a LAN machine**: `/hosts add` (stable; shows: always)
<!-- <<< tips <<< -->
