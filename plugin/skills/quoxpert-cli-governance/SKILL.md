---
name: quoxpert-cli-governance
description: "Reference for the `quox` verbs behind governance and evidence: policies and
  the WARD chain, certification, AEE envelopes, VOLT bundle verification, trace
  replay and comparison, the DoneEngine readiness check, QuoxSecurity
  engagements and findings, tool approvals and the HITL inbox, and the read-only
  cognitive implants (mind). Load when a task is \"is this actually done\",
  \"verify this evidence\", \"replay a trace\", \"approve a held action\",
  \"file a finding\"."
argument-hint: "<task, e.g. 'which flags does X take'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard (cli/)
    sources:
      - repo: quox-dashboard
        cmd: "quox <domain> --help (walked recursively by quoxpert-coverage)"
license: LicenseRef-SkillRights-Reserved-1.0
---

# Quoxpert CLI reference: Governance, evidence and engagements

Command reference generated from the live `quox` help tree. It lists the verbs that no hand-written recipe in the other quoxpert skills teaches yet. For concepts, approval flow and gotchas load `quoxpert-cli` first.

- Usage is `quox <verb> <args>`; `<arg>` is required, `[arg]` is optional, flags are indented under their verb.
- Add `-o json` for machine output (`table`, `json`, `csv`, `quiet`).
- Writes that are destructive or sensitive are held for human approval: report "awaiting approval", never "done".
- Never pass a secret as an argument: use the verb's stdin or file option.
- Regenerate with `quoxpert-coverage --regen-refs`; verify with `quoxpert-coverage` (fails on any stale verb or flag).

<!-- coverage-ref: governance,evidence,aee,volt,trace,done,engagement,approvals,inbox,mind -->

### quox governance

- Governance: policies, WARD chain, VOLT evidence + certification

```
quox governance approval resolve <entryId>   # Approve or reject a pending policy change
    --outcome <outcome>   # approved | rejected
    --reason <text>   # reason / comment for the decision
    --approved-by <id>   # approver identity (defaults to the logged-in user)
quox governance cert get <certId>   # Get a certification by ID
quox governance policy create   # Create a new governance policy
    --name <name>   # policy name
    --category <category>   # policy category
    --effect <effect>   # allow | deny | require_approval | redact |
    --priority <n>   # priority (lower runs first)
    --scope <json>   # scope as JSON, e.g. '{"agents":["*"]}'
    --conditions <json>   # conditions as JSON
    --enabled <bool>   # enabled state (true|false) (default: "true")
    --reason <text>   # reason for the policy
    --framework-mapping <json>   # framework mapping as a JSON array
    --audit-required   # flag this policy as requiring audit
quox governance policy delete <id>   # Delete a governance policy
quox governance policy get <id>   # Show policy details
quox governance policy history   # Show policy change history (org-wide, or a single policy with --policy)
    --policy <id>   # show history for a single policy ID instead of the whole org
    --operation <op>   # filter by operation: created | updated | deleted
    --actor <id>   # filter by actor ID
    --since <iso>   # filter: since ISO timestamp
    --until <iso>   # filter: until ISO timestamp
    --limit <n>   # max results
    --offset <n>   # result offset
quox governance policy list   # List governance policies
    --category <category>   # filter by category
    --enabled <bool>   # filter by enabled state (true|false)
    --effect <effect>   # filter by effect
    --limit <n>   # max results (default: "100")
    --offset <n>   # result offset (default: "0")
quox governance policy pending-approvals   # List policy changes awaiting second-approver sign-off
quox governance policy update <id>   # Update a governance policy (may require second-approver sign-off)
    --name <name>   # new name
    --category <category>   # new category
    --effect <effect>   # new effect: allow | deny | require_approval | redact |
    --priority <n>   # new priority
    --scope <json>   # new scope as JSON
    --conditions <json>   # new conditions as JSON
    --enabled <bool>   # new enabled state (true|false)
    --reason <text>   # reason for the change
    --enforce-4eyes   # require second-approver sign-off for this change
quox governance policy validate   # Validate a policy definition without saving (dry run)
    --name <name>   # policy name
    --category <category>   # policy category
    --effect <effect>   # allow | deny | require_approval | redact | log_only
    --priority <n>   # priority
    --scope <json>   # scope as JSON
    --conditions <json>   # conditions as JSON
    --enabled <bool>   # enabled state (true|false) (default: "true")
quox governance template conflicts <packId>   # Check a template pack for conflicts with existing policies before enabling
quox governance template enable <packId>   # Enable a template pack for the active org (creates its policies)
    --created-by <id>   # attribute the created policies to this actor
quox governance template list   # List available template packs
quox governance template show <packId>   # Show a template pack with its full policy set
quox governance traces   # Query quoxflow execution traces (observations)
    --task <id>   # task ID
    --correlation <id>   # correlation ID
    --workflow <id>   # workflow ID
    --org <id>   # org ID (overrides active org)
```

### quox evidence

- Evidence stores: AEE, WARD, VOLT

```
quox evidence bundle [conversation]   # Export a signed, offline-verifiable evidence bundle (zip) of every AEE envelope, WARD receipt and VOLT run for one conversation
    --out <file.zip>   # where to write it (default
    --json   # print the result as JSON
quox evidence status   # Evidence stores (AEE, WARD, VOLT): size, rows, time span, growth, archive and backup, read-only
quox evidence verify <file.zip>   # Verify an evidence bundle zip offline: file hashes, envelope list hash, counts and the Ed25519 signature (no network)
    --json   # print the result as JSON
```

### quox aee

- Agent Envelope Exchange protocol

```
quox aee conversations   # List AEE conversations
    --limit <n>   # max results (default: "20")
quox aee stats   # AEE statistics
quox aee store   # Store an AEE envelope
    --envelope <json>   # envelope data as JSON
```

### quox volt

- VOLT evidence bundle verification and inspection

```
quox volt export <file>   # Re-export a bundle in a different format
    --ndjson <outfile>   # export events as NDJSON
    --manifest <outfile>   # export manifest as JSON
    --pretty   # pretty-print JSON output
quox volt summary <file>   # Quick summary of a bundle (no verification)
```

### quox trace

- Trace Replay & Visualization: assembled traces, simulation, comparison, replay sessions

```
quox trace comparison create   # Persist a comparison across two or more traces
    --corr-ids <ids>   # comma-separated conversation IDs (corr) to compare
    --id <id>   # comparison ID (auto-generated if omitted)
    --name <name>   # comparison name
    --options <json>   # JSON comparison options
    --result <json>   # JSON precomputed comparison result
    --similarity-score <n>   # similarity score (0-1)
quox trace comparison delete <id>   # Delete a trace comparison
    --force   # skip confirmation
quox trace comparison delete-all   # Delete ALL trace comparisons
    --force   # skip confirmation
quox trace comparison get <id>   # Show a trace comparison
quox trace comparison list   # List trace comparisons
    --limit <n>   # max results (default: "30")
    --offset <n>   # result offset (default: "0")
quox trace comparison update <id>   # Rename a trace comparison
    --name <name>   # new name
quox trace correlation create   # Store a correlation tree in the cache (24h TTL)
    --root-run-id <id>   # root run ID
    --correlation-id <id>   # correlation ID
    --id <id>   # cache entry ID (auto-generated if omitted)
    --tree <json>   # JSON correlation tree (default: "{}")
    --stats <json>   # JSON stats object
    --agent-count <n>   # agent count (default: "0")
    --handoff-count <n>   # handoff count (default: "0")
quox trace correlation delete <rootRunId>   # Delete the cached correlation for a root run
    --force   # skip confirmation
quox trace correlation get <rootRunId>   # Show the cached correlation tree for a root run
quox trace correlation list   # List cached correlations
    --limit <n>   # max results (default: "30")
    --offset <n>   # result offset (default: "0")
quox trace replay create   # Create a replay session for a run
    --run-id <runId>   # the RUN_ id being replayed
    --id <id>   # replay session ID (auto-generated if omitted)
    --status <status>   # initial status (default: "pending")
    --query <text>   # replacement query for the replay
    --layer-config <json>   # JSON layer configuration
    --mock-config <json>   # JSON mock configuration
    --original-trace <json>   # JSON snapshot of the original trace
quox trace replay delete <id>   # Delete a replay session
    --force   # skip confirmation
quox trace replay delete-all   # Delete ALL replay sessions
    --force   # skip confirmation
quox trace replay get <id>   # Show a replay session
quox trace replay list   # List replay sessions
    --limit <n>   # max results (default: "30")
    --offset <n>   # result offset (default: "0")
quox trace replay update <id>   # Update a replay session (status and/or result)
    --status <status>   # new status
    --result <json>   # JSON replay result
```

### quox done

- Quox DoneEngine: is this actually done, and what is the evidence?

```
quox done bar [pack]   # One rule pack against its subjects: BOTH finish lines, build and deployed
    --snapshot   # append this reading to the snapshot history
    --org <id>   # measure FOR this org: plan evidence reads as it, the snapshot is
quox done board   # Estate scoreboard: every surface, score, attested gates, deploy state
    --json   # machine-readable, includes raw deploy state
    --dod   # per-surface gates, split by evidence class
    --no-deploy   # skip docker/git; Deployed Ready becomes unknown, which is not a
quox done check [subject]   # Can this ship? exit 0 clear, 1 refused with reasons, 2 unknown.
    --pack <id>   # rule pack to judge against (default: "launch-spine")
    --json   # structured verdict for agents
    --root <path>   # judge <subject> in this repo, reading its own STATUS map with
quox done checklist [pack]   # The builder checklist GENERATED from a pack (every gate the engine judges); --check verifies a doc that embeds it
    --check <file>   # exit 1 if the checklist block in this file has drifted from
quox done fetch   # Self-fetch the DoneEngine bundle, no human in the loop (quox#456 follow-on)
    --dest <path>   # install destination (default: $QUOX_DONEENGINE_HOME, else
    --force   # refetch and reinstall even if the current install already looks
quox done history [pack]   # Movement between snapshots, regressions listed first
quox done packs   # List available rule packs
```

### quox engagement

- QUOX-SECURITY: engagements + scope targets, live capability scanners (run via scan/scan-async; see "engagement tools" for the list), and findings (report/verify/regrade/resolve)

```
quox engagement regrade-finding <findingId> <severity>   # Re-grade a reported finding's severity (info | low | medium | high | critical).
    --reason <text>   # why the severity is being changed
quox engagement schedule create <engagementId> <target> <tool>   # Create a recurring schedule (tool: bare capability name, e.g.
    --interval <seconds>   # interval cadence in seconds (minimum 300)
    --cron <expr>   # cron cadence, a 5-field UTC expression e.g. "0 3 * * 3"
quox engagement schedule delete <scheduleId>   # Delete a schedule
quox engagement schedule disable <scheduleId>   # Disable a schedule (stops firing; existing history kept)
quox engagement schedule enable <scheduleId>   # Re-enable a schedule
quox engagement schedule list <engagementId>   # List schedules for an engagement
quox engagement schedule show <scheduleId>   # Show a schedule, including its last diff summary
quox engagement schedule update <scheduleId>   # Edit a schedule: change its cadence (--interval or --cron), target, tool, or enabled state
    --interval <seconds>   # switch to interval cadence in seconds (minimum 300)
    --cron <expr>   # switch to cron cadence, a 5-field UTC expression e.g. "0
    --target <value>   # change the target value (must be a verified, in-scope
    --tool <name>   # change the tool (bare capability name, e.g. vuln_scan)
    --enable   # enable the schedule
    --disable   # disable the schedule
quox engagement verify <id>   # Verify the WARD witness for an engagement (recompute receipt + Ed25519 tip signature)
```

### quox approvals

- Tool approvals (held actions awaiting or past a human decision)

```
quox approvals grants revoke <grantId>   # Revoke a standing grant now (human org admin only)
quox approvals walkthrough   # Walk through the questions waiting for you one at a time: what it does, why, my advice, then your choice
```

### quox inbox

- Manage inbox and approval requests

```
quox inbox stats   # Show inbox statistics
quox inbox walkthrough   # Walk through the questions waiting for you one at a time: what it does, why, my advice, then your choice
```

### quox mind

- QuoxMind: the cognitive implants (read-only)

```
quox mind health   # Summary of QuoxMind health across all implants
quox mind implant <id>   # One implant in detail (e.g.
quox mind implants   # List the cognitive implants: purpose, status, last activity
```

<!-- /coverage-ref -->
