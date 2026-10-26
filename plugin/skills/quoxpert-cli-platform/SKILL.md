---
name: quoxpert-cli-platform
description: "Reference for the `quox` verbs that operate the platform itself: admin (keys,
  config, retention, logs, stats), server (self-hosted install
  status/update/rollback/doctor), update, shortcut, service health, monitoring
  and mon (Docker fleet, Wazuh, metrics), settings and feature flags, CLI
  config/profiles, backups, spend budgets, LLM routing policy and provider
  status, governed fetch and research settings, integrations (deprecated alias
  of vault), capabilities. Load when a task is about running, tuning or health-
  checking a Quox instance from the terminal."
argument-hint: "<task, e.g. 'which flags does X take'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard (cli/)
    sources:
      - repo: quox-dashboard
        cmd: "quox <domain> --help (walked recursively by quoxpert-coverage)"
license: LicenseRef-SkillRights-Reserved-1.0
---

# Quoxpert CLI reference: Platform, server and settings

Command reference generated from the live `quox` help tree. It lists the verbs that no hand-written recipe in the other quoxpert skills teaches yet. For concepts, approval flow and gotchas load `quoxpert-cli` first.

- Usage is `quox <verb> <args>`; `<arg>` is required, `[arg]` is optional, flags are indented under their verb.
- Add `-o json` for machine output (`table`, `json`, `csv`, `quiet`).
- Writes that are destructive or sensitive are held for human approval: report "awaiting approval", never "done".
- Never pass a secret as an argument: use the verb's stdin or file option.
- Regenerate with `quoxpert-coverage --regen-refs`; verify with `quoxpert-coverage` (fails on any stale verb or flag).

<!-- coverage-ref: licence,dev,admin,server,update,shortcut,service,monitoring,mon,settings,config,backup,budget,llm,llm-policy,provider,fetch,research,integration,capabilities -->

### quox licence

- Instance licence status, lease refresh and seat bands

```
quox licence catalogue-sign|catalog-sign
    --apply   # actually sign and publish to the website API
    --out <path>   # after --apply, save the signed catalogue (public
    --website-profile <name>   # website session profile (default: "default")
quox licence reissue <licenseId>
    --orgs <n>   # org band for every banded/added id (default 10)
    --add <ids>   # comma-separated ids to ADD as <id>@orgs=N
    --band <ids>   # comma-separated ids already present to FORCE-band
    --apply   # actually reissue (otherwise dry run, nothing
    --website-profile <name>   # website session profile (default: "default")
quox licence website-login   # Log in to the quox.ai website admin API for reissue/catalogue-sign (stores the session cookie only, 0600)
    --website-profile <name>   # website session profile (default: "default")
    --url <url>   # website base URL (default: "https://quox.ai")
    --username <name>   # website admin username
    --password-stdin   # read the password from stdin (one line) instead of
quox licence website-logout   # End the website admin session and delete the stored cookie
    --website-profile <name>   # website session profile (default: "default")
```

### quox dev

- Manage dev-mode (DEVSUITE) fleet hosts

```
quox dev supervisor run
    --slot <name>   # slot to poll (default: resident bootstrap profile)
    --host <hostId>   # dev host_id (default: resident bootstrap profile)
    --once   # run a single poll pass and exit (what tests drive)
    --service   # Option A persistence: idle instead of exit when the
    --log <path>   # log file path (default:
    --state <path>   # continuity state file path (default:
    --resident-profile <path>   # resident bootstrap profile path (default:
    --from <name>
    --history <n>   # channel messages carried as continuity handover per
    --max-age-minutes <n>
    --pump-state <path>   # warden pump continuity state file path
    --alarm-state <path>   # warden alarm continuity state file path
```

### quox admin

- Platform administration

```
quox admin agent-identity mint <agentId>   # Mint (or rotate) an agent identity; prints the raw token ONCE
    --org <orgId>   # org ULID the agent operates under
    --rotate   # revoke the live token and issue a new one
quox admin email setup   # Configure instance SMTP (password encrypted at rest; omit --pass to keep the stored one)
    --host <host>   # SMTP host
    --port <port>   # SMTP port (default: "587")
    --user <user>   # SMTP username
    --pass <pass>   # SMTP password
    --from <from>   # From address, e.g. "QuoxCORE <noreply@acme.com>"
    --secure   # Use TLS (direct TLS for 465, STARTTLS otherwise) (default:
    --no-secure   # Disable TLS
quox admin email status   # Show email delivery status (configured, from, last test)
quox admin email test   # Send a test email and report the honest outcome
    --to <address>   # Recipient (defaults to your account email)
quox admin enforcement break-glass <flag>   # Open a bounded break-glass window so a gate may stay off in production
    --reason <reason>   # why this gate has to be off (recorded against your account)
    --hours <hours>   # window length in hours, 72 maximum (default: "4")
quox admin enforcement clear <flag>   # Close a break-glass window early
quox admin enforcement list   # Show every enforcement flag: what the environment asks for and what is actually enforced
quox admin key create   # Create an API key
    --name <name>   # key name
    --role <role>   # key role (default: "viewer")
    --expires <date>   # expiry date (ISO)
quox admin key delete <keyId>   # Delete an API key
quox admin key list   # List API keys
quox admin key test <keyId>   # Test an API key
quox admin retention cleanup   # Run retention cleanup
    --dry-run   # preview without deleting
quox admin retention config   # View retention config
quox admin retention stats   # View retention statistics
```

### quox server

- Your self-hosted Quox install: status, update, rollback, uninstall, doctor, diag

```
quox server config app-url [url]   # Show or set the public app URL (used in sign-in links and emails).
    --clear   # remove the stored value
quox server diag   # Write a redacted support bundle locally (never uploaded)
    --dir <path>   # the install directory (default: the one Getting started
    --out <dir>   # where to write it (default: the current directory)
quox server doctor   # The quox doctor checks plus server-side checks (read-only)
    --dir <path>   # the install directory (default: the one Getting started
quox server go <name>   # Open a Quox window on a registered dev server (ssh via your own config and the Bastion jump host, then quox in its workdir)
    --dry-run   # print what would run and run nothing
quox server list   # The registered dev servers: purpose, project, reachable, and which one this is (read-only)
quox server mark <name>   # Record what a dev server is for (org registry on the Quox server, additive): purpose, project, repo, workdir, ci
    --purpose <text>   # what this server is for, e.g. "main dev"
    --project <text>
    --repo <text>
    --workdir <path>   # where go starts quox on that server
    --ci <text>   # CI or auto-deploy note or URL
    --user <user>   # ssh user (default control)
    --jump <host>   # ssh ProxyJump alias (default <bastion-host>)
    --last-deploy <text>   # last deploy note (shown only if any server has one)
quox server roles list   # Show each role, its URL, and whether it comes from the registry or the environment (read-only)
quox server roles set <role> <url>
    --test   # probe <url> for health and version before storing it; abort if it
quox server roles unset <role>
quox server rollback   # Restore the previous snapshot and version (database, config, code)
    --dir <path>   # the install directory (default: the one Getting started
    --dry-run   # print the plan and run nothing
    --snapshot <dir>   # a specific snapshot (default: the latest)
    --list   # list the snapshots and exit
    --yes   # skip the confirmation
quox server status   # Version, health per service, disk, ports and the last update (read-only)
    --dir <path>   # the install directory (default: the one Getting started
quox server uninstall   # Remove this install (lists everything first; keeps backups unless --purge)
    --dir <path>   # the install directory (default: the one Getting started
    --dry-run   # list what would be removed and run nothing
    --purge   # also delete every backup
    --no-backup   # skip the final snapshot
    --yes   # non-interactive: confirm step one (needs --confirm too)
    --confirm <path>   # non-interactive: confirm step two by naming the install
quox server update   # Update to the latest release: backup first, then fetch, build, migrate, health; rolls back on failure
    --dir <path>   # the install directory (default: the one Getting started
    --dry-run   # print the plan and run nothing
    --to <version>   # a specific release (default: the latest quoxcore tag)
    --force   # proceed despite local changes or low disk, or re-apply the
    --restart   # abandon a stopped update to a different version and start this
    --no-rollback   # on failure, stop where it failed instead of rolling back
    --yes   # skip the confirmation
```

### quox update

- Update quox to the latest version (npm, git checkout, or this box's shared CLI); also quox --update

```
quox update   # Update quox to the latest version (npm, git checkout, or this box's shared CLI); also quox --update
    --check   # show what an update would do and change nothing
    --yes   # update without asking (needed in a non-interactive shell)
```

### quox shortcut

- A short command for quox, like q (add / remove); refuses if the name already runs something else, never uses sudo

```
quox shortcut add   # Make a "q" command that runs quox: a symlink in a directory you own that is on PATH.
    --name <name>   # the short command name (default: "q")
    --yes   # create without asking (needed in a non-interactive shell)
quox shortcut remove   # Remove the short command, only if it is a link to this quox (anything else named q is left alone)
    --name <name>   # the short command name (default: "q")
```

### quox service

- Check service health and status

```
quox service health [name]   # Check health of all QuoxCORE services
```

### quox monitoring

- Platform health and governance s

```
quox monitoring incidents get <id>
```

### quox mon

- Monitoring: Docker fleet, Wazuh security, AGH-chain leaderboard, metrics

```
quox mon agh-chain agent <agentId>   # Show honesty metrics for a single agent
    --window <window>   # 24h|7d|30d (default: "24h")
quox mon agh-chain events <agentId>   # Show drill-through events for a guard kind
    --window <window>   # 24h|7d|30d (default: "24h")
    --guard <kind>   # guard kind (default: "claims_stripped")
quox mon config get   # Show configured monitoring service URLs
quox mon config grafana   # Show the configured Grafana base URL
quox mon docker action <id> <action>   # Start/stop/restart a container (destructive)
    --host <hostId>   # host the container lives on
    --force   # skip confirmation
quox mon docker container <id>   # Show container detail (stats + recent logs)
    --host <hostId>   # host the container lives on
quox mon docker df   # Show Docker disk usage on a host
    --host <hostId>   # host to query
quox mon docker inspect <id>   # Show container state and health (failing probe command and last results)
    --host <hostId>   # host the container lives on
quox mon docker logs <id>   # Show container logs
    --host <hostId>   # host the container lives on
    --tail <n>   # number of lines (default: "100")
quox mon docker stacks   # List Docker Compose stacks
    --host <hostId>   # filter to a single host
quox mon docker stats <id>   # Show container resource stats
    --host <hostId>   # host the container lives on
quox mon metrics   # Show Prometheus scrape metrics (collector fleet gauges)
    --raw   # print the raw Prometheus exposition text
quox mon wazuh active-response   # Trigger a Wazuh active response (HITL-gated — requires HITL Inbox approval)
    --command <command>   # firewall-block|host-isolate|restart-wazuh-agent
    --agents <ids>   # comma-separated Wazuh agent IDs
    --reason <text>   # justification (min 10 characters)
    --args <args>   # comma-separated command arguments
    --force   # skip confirmation
quox mon wazuh alerts   # Query recent Wazuh alerts
    --q <query>   # search text (rule description / agent name / rule groups)
    --limit <n>   # max results (default 50, capped at 500)
quox mon wazuh deploy-agent   # Queue a Wazuh agent deploy for one host (HITL-gated — requires HITL Inbox approval)
    --hostname <hostname>   # target hostname
    --host-ip <ip>   # target host IP
    --wazuh-server <ip>   # Wazuh manager IP (defaults to server config)
    --bastion-host <ip>   # bastion host for the SSH hop
    --ssh-user <user>   # SSH user (default: "control")
    --ssh-port <n>   # SSH port (default: "22")
    --force   # skip confirmation
quox mon wazuh deploy-bulk   # Queue a Wazuh agent deploy for multiple hosts (HITL-gated — requires HITL Inbox approval)
    --hosts <json>   # JSON array of {hostname, ip} objects
    --wazuh-server <ip>   # Wazuh manager IP (defaults to server config)
    --bastion-host <ip>   # bastion host for the SSH hop
    --force   # skip confirmation
quox mon wazuh deploy-history   # Show Wazuh agent deploy history
    --mode <mode>   # latest|all (default: "latest")
    --limit <n>   # max results (mode=all only) (default: "200")
quox mon wazuh status   # Show Wazuh manager status
quox mon wazuh vulns   # Query current vulnerability states
    --agent-id <id>   # filter by agent ID
    --agent-name <name>   # filter by agent name
    --severity <severity>   # filter by severity
    --limit <n>   # max results (default 100, capped at 1000)
```

### quox settings

- View and change org platform settings (feature flags)

```
quox settings get <key>   # Show one platform setting
quox settings history   # Show the platform settings change history (admin)
    --key <key>   # filter to one setting
    --limit <n>   # max rows (default: "50")
quox settings list   # List effective platform settings for the active org
```

### quox config

- Manage CLI configuration and profiles

```
quox config get [key]   # Get a config value
quox config profile list   # List all profiles
quox config profile remove <name>   # Remove a profile
```

### quox backup

- Manage backups

```
quox backup delete <backupId>   # Delete a backup
quox backup get <backupId>   # Get backup details
quox backup server create   # Dispatch a server-wide backup on the configured runner host
    --mode <mode>   # backup mode: full, quick (default: "full")
quox backup server download <archiveId>   # Download a server-wide archive to a local file
    --out <path>   # output file (default ./<archiveId>.tar.gz)
quox backup server list   # Archives the runner host has registered
quox backup server restore <archiveId>   # Restore the whole box from a server-wide archive (DRY RUN unless --execute)
    --execute   # perform a REAL restore (destroys current data), not a dry run
    --stores <list>   # comma-separated store names to restore (default: all in the
quox backup server restore-status   # Live restore-engine state on the runner host, plus recent restore receipts
quox backup server status   # Runner readiness and live state, plus the latest durable receipts
```

### quox budget

- Manage quoxflow spend/usage budgets (org, objective, execution, iteration scope)

```
quox budget create   # Create a budget
    --scope <kind>   # scope kind (org|objective|execution|iteration)
    --scope-id <id>   # scope id (e.g. org id, objective id, execution id,
    --period-start <iso>   # period start (ISO timestamp)
    --period-end <iso>   # period end (ISO timestamp)
    --max-tokens <n>   # max total tokens (in + out)
    --max-cost-usd-micro <n>   # max cost in micro-USD (1 USD = 1,000,000)
    --max-tool-calls <n>   # max tool calls
    --max-duration-ms <n>   # max wall-clock duration (ms)
    --max-iterations <n>   # max iterations
    --no-hard-stop   # do not hard-stop execution when exceeded (default:
quox budget delete <id>   # Delete a budget
    --force   # skip confirmation
quox budget get <id>   # Show budget details
quox budget list   # List budgets for the active org
    --scope <kind>   # filter by scope kind (org|objective|execution|iteration)
    --scope-id <id>   # filter by scope id
quox budget update <id>   # Update a budget
    --period-start <iso>   # new period start (ISO timestamp)
    --period-end <iso>   # new period end (ISO timestamp)
    --max-tokens <n>   # new max total tokens
    --max-cost-usd-micro <n>   # new max cost in micro-USD
    --max-tool-calls <n>   # new max tool calls
    --max-duration-ms <n>   # new max wall-clock duration (ms)
    --max-iterations <n>   # new max iterations
    --hard-stop <bool>   # set hard_stop (true|false)
quox budget usage <id>   # Show rolled-up usage + daily breakdown for a budget
    --since <iso>   # filter usage since this ISO timestamp
    --until <iso>   # filter usage until this ISO timestamp
```

### quox llm

- LLM provider status and failover

```
quox llm status   # Show LLM provider status, degraded state, and the failover target
```

### quox llm-policy

- View, set, and dry-run-validate the org LLM routing policy

```
quox llm-policy get   # Show the effective LLM routing policy for the active org
quox llm-policy set   # Save a new LLM routing policy for the active org (requires ORG_MANAGE_SETTINGS)
    --file <path>   # path to a JSON file containing the policy object
    --policy <json>   # inline JSON policy object
quox llm-policy test   # Dry-run validate a policy without saving it
    --file <path>   # path to a JSON file containing the policy object
    --policy <json>   # inline JSON policy object
```

### quox provider

- Connect the AI providers your org uses (the same as /connect in the Quox terminal)

```
quox provider install <tool>   # Install Claude Code or Codex on this Quox server from npm (the vendor's own package), so Claude sign-in and Codex work.
    --yes   # install without the y/N question (a script; an agent still gets an
```

### quox fetch

- Governed agent fetch: which URLs your agents may GET

```
quox fetch allow add <url-prefix>   # Allow agents to GET URLs under a prefix, e.g.
    --note <text>   # why it is allowed, shown alongside it later
quox fetch allow list   # Show the allowed URL prefixes for this org
quox fetch allow remove <url-prefix>   # Stop allowing a URL prefix
```

### quox research

- Governed web research settings

```
quox research domains add <domain>   # Add a domain (or host/path-prefix; a leading = means exact host only) to the org list (human org admin)
quox research domains list   # Show the effective trusted research list and where it comes from
quox research domains remove <domain>   # Remove a domain from the org list (human org admin)
```

### quox integration

- DEPRECATED: alias of — kept for existing scripts

```
quox integration create   # DEPRECATED — alias of
    --type <type>   # integration type (skip prompt)
    --label <label>   # display label (skip prompt)
    --set-default   # set as default for this type
    --no-test   # skip connection test after creation
    --credentials-file <path>   # JSON object of {field: value} for the credential
    --credentials-stdin   # read that same JSON object from stdin (never
    --metadata <json>   # JSON object of non-secret metadata tags
    --repos <patterns>   # repositories this credential covers:
    --no-input   # never prompt; fail with a clear error if a required
quox integration delete <integrationId>   # DEPRECATED — alias of
    --force   # skip confirmation
quox integration get <integrationId>   # DEPRECATED — alias of
quox integration list   # DEPRECATED — alias of
    --type <type>   # filter by integration type
    --status <status>   # filter by test status (success|failed|untested)
quox integration test <integrationId>   # DEPRECATED — alias of
quox integration update <integrationId>   # DEPRECATED — alias of
    --label <label>   # new label
    --description <desc>   # new description
```

### quox capabilities

- What this Quox can do for your org: ready, needs setup, not available, planned

```
quox capabilities [name]   # What this Quox can do for your org: ready, needs setup, not available, planned
```

<!-- /coverage-ref -->
