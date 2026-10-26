---
name: quoxpert-cli-fleet
description: "Reference for the `quox` verbs that show and coordinate live work: dev slots
  and their rooms, governed tmux sessions, who is active, presence, real-time
  watch dashboards, peek by id, LUCID and awareness ledgers, HYPERION VM
  activity, Proxmox VM tools, RouterOS read-only views, status-bar rows, side
  questions (aside), the dashboard opener and Telegram bridge verbs. Load when a
  task is \"who is doing what\", \"what changed\", \"post into a slot\", \"show
  the VMs\", \"add a status row\"."
argument-hint: "<task, e.g. 'which flags does X take'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard (cli/)
    sources:
      - repo: quox-dashboard
        cmd: "quox <domain> --help (walked recursively by quoxpert-coverage)"
license: LicenseRef-SkillRights-Reserved-1.0
---

# Quoxpert CLI reference: Fleet, sessions and situational awareness

Command reference generated from the live `quox` help tree. It lists the verbs that no hand-written recipe in the other quoxpert skills teaches yet. For concepts, approval flow and gotchas load `quoxpert-cli` first.

- Usage is `quox <verb> <args>`; `<arg>` is required, `[arg]` is optional, flags are indented under their verb.
- Add `-o json` for machine output (`table`, `json`, `csv`, `quiet`).
- Writes that are destructive or sensitive are held for human approval: report "awaiting approval", never "done".
- Never pass a secret as an argument: use the verb's stdin or file option.
- Regenerate with `quoxpert-coverage --regen-refs`; verify with `quoxpert-coverage` (fails on any stale verb or flag).

<!-- coverage-ref: slot,sessions,tg,presence,active,watch,peek,dashboard,motion,aside,hyperion,vm,router,lucid,awareness,rows,nucleus -->

### quox slot

- Manage DEVSUITE-SLOTS: checkout/release the fixed session addresses, say/read into a slot room

```
quox slot ack <id>   # Acknowledge a broadcast on behalf of a slot you hold
    --slot <name>   # the slot acknowledging
quox slot assign <name> [session]   # Assign a slot to an expected holder (session name); slot stays free until claimed
    --clear   # clear the assignment
quox slot bridge clear <platform>   # Clear the bridge room for a platform (telegram|discord)
quox slot bridge list   # Show the configured bridge rooms for the active org
quox slot broadcast-status <id>   # Delivered / acknowledged / awaiting counts for a broadcast
quox slot leave <name>   # Leave a slot room you joined (does not release a hold)
    --session <s>   # session name (default: $QUOX_STREAM)
quox slot peek <name>   # Alias of
    --session <s>   # your session name: marks the channel read if you are the
quox slot prune   # Retire old unused slots (free, idle longer than --older-than days).
    --older-than <days>   # idle threshold in days (default: "14")
    --keep-channels   # keep the Discord channels (default: delete them)
    --keep-orphans   # skip the orphan Discord channel sweep (channels of slots
    --yes   # actually retire; without it this is a dry run
quox slot retire <name>   # Retire (delete) a slot
    --delete-channel   # also delete the slot's Discord channel (default: keep it,
quox slot rooms   # List the slot rooms a session has joined
    --session <s>   # session name (default: $QUOX_STREAM)
```

### quox sessions

- Everything live in your org, grouped by agent (bare); ls, attach, kill, report manage tmux sessions

```
quox sessions attach <name>   # Reattach to a running Quox session
quox sessions kill <name>   # Kill a Quox session
```

### quox tg

- Manage Telegram Pro: onboarding status,  binding, session leases, webhook admin

```
quox tg bind-owner <tg_chat_id>
    --bot <botId>   # target a specific bot ID instead of the default gateway bot
quox tg leases   # List session leases for parallel terminal identities (T1-T8)
quox tg setup <webhook_url>   # Register the Telegram webhook URL for the bot
    --bot <botId>   # target a specific bot ID instead of the default gateway bot
quox tg status
    --bot <botId>   # target a specific bot ID instead of the default gateway bot
quox tg webhook-info   # Show current Telegram webhook status (per-bot info is pending backend support; --bot is a no-op today)
    --bot <botId>   # target a specific bot ID (not yet honored server-side)
```

### quox presence

- Is a person at their terminal? With no name: everyone with presence on record. When someone is away, approvals queue; work on something else

```
quox presence set <state>   # Say where you are: present, away or sleeping (a human login only).
    --note <text>   # a short note sessions will see ("school run")
    --slots <list>   # your own window slots, comma separated (hitl and
    --auto-away <minutes>   # read as away after this many idle minutes; "off" to
```

### quox active

- Who is doing what: one line per active worker, grouped working / waiting on you / idle; filter: sessions, slots, agents

```
quox active [filter]   # Who is doing what: one line per active worker, grouped working / waiting on you / idle; filter: sessions, slots, agents
    --json   # print the summary as JSON
    --all   # show every worker (default: top 10 per group)
    --lines   # the older one-line-per-worker layout with state and age columns
```

### quox watch

- Real-time monitoring dashboards

```
quox watch services   # Live service health dashboard
    --interval <seconds>   # Refresh interval (default: "10")
```

### quox peek

- Look up an envelope, inbox item, objective, run, WARD receipt or agent by id (read only)

```
quox peek <id>   # Look up an envelope, inbox item, objective, run, WARD receipt or agent by id (read only)
```

### quox dashboard

- Open the web dashboard signed in (one-time link, 10 minutes). Pages: sessions, approvals, agents, lucid, inbox, seo, settings

```
quox dashboard [page]   # Open the web dashboard signed in (one-time link, 10 minutes).
```

### quox motion

- Play the Quox motion gallery: the Q intro, portal, particle, the Dragon's Eye, the status Q, ring, reveals and the living dragon (no server needed)

```
quox motion [scenes...]   # Play the Quox motion gallery: the Q intro, portal, particle, the Dragon's Eye, the status Q, ring, reveals and the living dragon (no server needed)
    --narrow   # use the 40-column layout (the compact Q)
    --slow   # play three times slower
    --mono   # no colour (also honoured: NO_COLOR)
```

### quox aside

- Ask a read-only side question: no tools, not saved to any conversation

```
quox aside <question...>   # Ask a read-only side question: no tools, not saved to any conversation
    --agent <id>   # who answers (default quox)
```

### quox hyperion

-  activity: which VMs exist, who holds each and why, node load and recent operations

```
quox hyperion deck
quox hyperion status   # Same as bare
    --json   # print the full JSON response
```

### quox vm

- Proxmox VMs via the  agent tools (governed: held calls wait for approval)

```
quox vm cluster   # Proxmox cluster health: quorum and nodes (read only)
quox vm doctor <target>   # Why is this VM slow or unhealthy? Verdict and ranked findings with evidence and a suggested fix (read only; name or vmid)
quox vm ha   # Proxmox HA status (read only)
quox vm info <target>   # Resources and state of one VM (name or vmid)
quox vm resolve <name>   # Find which node and VMID a VM name lives on (read only)
quox vm storage   # Proxmox storage pools and usage (read only)
quox vm templates   # Golden templates you can clone from (read only)
```

### quox router

- MikroTik RouterOS read-only views via NETWATCH (health, DHCP, VPN, inventory)

```
quox router conflicts   # IP address conflicts seen by the router, ARP vs DHCP leases (read only)
quox router free-ip   # Spare pool addresses for static assignment; reserves nothing (read only)
    --count <n>   # how many addresses (1-20) (default: "3")
    --pool <name>   # only this DHCP pool
quox router health   # Router CPU, memory, temperature and uptime (read only)
quox router inventory   # MikroTik routers and the devices connected to them (read only)
quox router leases   # DHCP leases: which devices hold an address (read only)
quox router pools   # DHCP pool usage: size, used, free (read only)
quox router trust   # Show the router's current TLS fingerprint, sending no credentials (never pins; you set MIKROTIK_TLS_PIN yourself)
    --show   # print the fingerprint the router's HTTPS endpoint presents now
quox router vpn   # VPN tunnel health, WireGuard and IPsec (read only)
quox router wireguard   # WireGuard peers and whether each is connected (read only)
```

### quox lucid

- LUCID: what needs you, what changed since you last looked, what is in motion, what I cannot see

```
quox lucid sitrep   # One-shot formatted snapshot (areas, what needs you, what changed, what I cannot see)
    --agent   # compact, id-rich form for agents
    --json   # the full structured situation
    --spoken   # sentences only, as read on the phone
    --markdown   # chat-ready Markdown for Discord, Matrix and slots (fits one
```

### quox awareness

- QuoxAwareness: cross-surface situational-awareness ledger

```
quox awareness list   # List awareness entries for the active org
    --source <text>   # filter by source
quox awareness post <key> <state>   # Post or update an awareness entry (upsert by key)
    --title <text>   # short title
    --detail <text>   # longer detail
    --source <text>   # who is posting this entry (default: "manual")
    --severity <level>   # info|warn|critical (default: "info")
    --ttl <seconds>   # expire the entry after this many seconds
quox awareness remove <key>   # Remove an awareness entry
quox awareness summary   # Current-state briefing (what a reader like the voice receptionist sees)
```

### quox rows

- Your live lines above the quox window's status bar: add, edit, remove, test, share, import (url, quox, plugin or local command rows)

```
quox rows contract   # The JSON a row endpoint returns (the status-row contract), with an example
quox rows edit <id>   # Change a row: any of the add options; --contract drops the template
    --url <url>   # read JSON or text from a URL (no credentials are sent
    --quox <path>   # read a path on your own Quox with your session, e.g.
    --service <name>   # for --quox: auth (default) or collector
    --plugin <id>   # read a status row a plugin ships (its manifest
    --row <rowId>   # for --plugin: which of its status rows (default: the
    --path <path>   # for --plugin: a route of the plugin backend instead of
    --cmd <command>   # run a local command (this machine only, never synced)
    --template <template>   # fill {{path}} from the data; leave out to read the
    --every <interval>   # refresh interval: 30s, 5m, 1h (5 s to 1 day)
    --label <text>   # a short name drawn first
    --colour <role>   # text colour: prose, command, value, ok, warn, error,
    --contract   # read the status-row contract instead of a template
quox rows import <file>   # Add rows from a share bundle (a file, or - for stdin).
    --trust-commands   # offer each command row for a yes/no, one by one (needs a
    --replace   # replace rows that have the same id
quox rows remove|rm <id>   # Remove a row
quox rows share [ids...]   # Print a bundle of your rows for someone else to import.
```

### quox nucleus

- Ask the codebase a question (RepoBrain, governed and audited)

```
quox nucleus query <question...>   # Query the codebase and get cited file:line snippets
    --target <repo>   # repo to search (default: quox-dashboard)
    --limit <n>   # max snippets to return (default: "8")
```

<!-- /coverage-ref -->
