---
name: quoxpert-cli-channels
description: "Reference for the `quox` verbs that reach people and the outside world:
  ContactsQ contacts, InboxQ mail, Calendar-Q, QuoxVoice telephony, QuoxChat
  website widgets, Qlarity governed browser inspection, QuoxSEO, X, YouTube, the
  Discord daemon and QuoxVault credentials. Load when a task is \"find a
  contact\", \"triage mail\", \"check the calendar\", \"inspect a page\", \"post
  to X\"."
argument-hint: "<task, e.g. 'which flags does X take'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard (cli/)
    sources:
      - repo: quox-dashboard
        cmd: "quox <domain> --help (walked recursively by quoxpert-coverage)"
license: LicenseRef-SkillRights-Reserved-1.0
---

# Quoxpert CLI reference: Channels, comms and publishing surfaces

Command reference generated from the live `quox` help tree. It lists the verbs that no hand-written recipe in the other quoxpert skills teaches yet. For concepts, approval flow and gotchas load `quoxpert-cli` first.

- Usage is `quox <verb> <args>`; `<arg>` is required, `[arg]` is optional, flags are indented under their verb.
- Add `-o json` for machine output (`table`, `json`, `csv`, `quiet`).
- Writes that are destructive or sensitive are held for human approval: report "awaiting approval", never "done".
- Never pass a secret as an argument: use the verb's stdin or file option.
- Regenerate with `quoxpert-coverage --regen-refs`; verify with `quoxpert-coverage` (fails on any stale verb or flag).

<!-- coverage-ref: contacts,mail,calendar,voice,quoxchat,qlarity,seo,x,youtube,discord,vault -->

### quox contacts

- ContactsQ: governed contacts (add, find, resolve caller-ID, suppress)

```
quox contacts add-id <id>   # Add an identifier to a contact
    --phone <v>   # phone number
    --email <v>   # email address
    --social <v>   # social handle as network:handle
    --url <v>   # URL
    --label <l>   # label (work, home, ...)
quox contacts archive <id>   # Archive a contact (not erasure)
quox contacts best-channel <id>   # Which channel (voice, email or sms) may be used to reach a contact for a purpose, with every alternative and its reason codes.
    --purpose <purpose>   # service, transactional, marketing or research (default:
quox contacts certificate <erasure-id>   # Print an erasure certificate (org admin)
quox contacts compliance   # Compliance bands: Article 14 notices overdue, candidates expiring, no lawful basis, consents expiring
quox contacts count   # How many contacts: the total (people and organisations, not archived or erased) with counts by kind, status and relationship.
    --kind <kind>   # person or organisation
quox contacts duplicates   # Suggest duplicate pairs (same identifier, or same name at the same organisation)
quox contacts facts <id>   # List a contact's facts (human).
    --confirm <fact-id>   # confirm a proposed fact
    --reject <fact-id>   # reject a proposed fact
quox contacts find <text>   # Find contacts by name (same as list --q)
    --status <s>   # status filter
    --limit <n>   # max contacts
quox contacts grant list   # Options: -h, --help display help for command
quox contacts grant revoke <grant-id>   # Options: -h, --help display help for command
quox contacts leases <id>   # Lease + use ledger for a contact (who was given access, when, why; never the values)
quox contacts list   # List contacts
    --q <text>   # name filter
    --status <s>   # active | candidate | archived | all (default: everyone
    --relationship <r>   # primary relationship, e.g. customer | supplier | partner
    --limit <n>   # page size (default 25, max 100)
    --offset <n>   # skip this many (paging: the footer prints the next
quox contacts notice-sent <id>   # Record that the Article 14 notice was sent to a contact
    --evidence <ref>   # reference to the evidence (WARD ref, message id)
quox contacts processing-record   # Article 30 record of processing for this org (no personal data; org admin)
    --out <file>   # write to a file
quox contacts reindex   # Re-key every blind index under the current master key (master-key rotation step; org admin)
quox contacts scheduled cancel <id>   # Arguments: id scheduled send id (ss_...)
quox contacts scheduled list   # Options: --status <s> comma list of pending,sending,sent,failed,cancelled (default pending,sending) -h, --help display help for command
    --status <s>   # comma list of pending,sending,sent,failed,cancelled (default
quox contacts send <contact> <text>   # Send an SMS or email to a contact now, or at a time with --at (the server delivers it; the answer says exactly when)
    --channel <c>   # sms | email (default: "sms")
    --at <time>   # send later: ISO time with offset, or a clock time like 10am /
    --tz <zone>   # IANA zone for --at (default: "Europe/London")
    --title <t>   # subject (email)
    --purpose <p>   # service | transactional | marketing | research | personal
    --reason <text>   # why (recorded as a hash only)
quox contacts settings   # Show or update ContactsQ settings (updates are admin only)
    --region <cc>   # default phone region, e.g. GB
    --candidate-days <n>   # days to keep auto-created candidates
    --reaper <on|off>   # retention reaper kill switch
    --reaper-time <HH:MM>   # UTC time of day the reaper runs (default 03:15)
    --backup-days <n>   # days until an erased contact ages out of
    --report <weekly|monthly|off>   # recurring compliance report to the Approvals
    --report-day <n>   # report day: weekly 1-7 (Mon=1), monthly 1-28
    --report-time <HH:MM>   # UTC time of day the report is delivered
    --strict-names <on|off>   # store names encrypted (agents see a
quox contacts strict-names <action>   # Apply the org strict_names setting to existing contacts, both directions (org admin)
quox contacts suppress <value>   # Add a number or email to the suppression list (blind index only)
    --reason <r>   # dnc | do_not_market | bounced
    --channel <c>   # phone | email (default: auto-detect)
quox contacts suppressed <value>   # Check whether a number or email is suppressed
    --channel <c>   # phone | email (default: auto-detect)
quox contacts sync disable <id>   # Stop scheduled sync for a source (contacts are kept)
quox contacts sync enable <id>   # Enable a source for scheduled sync (also clears a retirement after repeated failures)
quox contacts sync list   # List sync sources with last run and status
quox contacts sync remove <id>   # Remove a sync source: stops syncing, keeps every contact already pulled
    --yes   # confirm (refused without it)
quox contacts timeline <id>   # Interaction history of a contact, newest first: surface, direction, outcome and time (refs only, no message bodies)
    --limit <n>   # max entries (default: "20")
```

### quox mail

- InboxQ: connected mail accounts, triaged messages, zones, sync, reports, watches, proposals

```
quox mail disconnect <accountId>   # Disconnect a mail account
quox mail moves   # List recent undoable moves (most recent first)
    --account <id>   # filter by account ID
    --limit <n>   # max results (default: "20")
quox mail proposals   # List proposals
    --status <status>   # filter by status
    --account <id>   # filter by account ID
quox mail propose   # Create a proposal (file, block or draft) for an account
    --account <id>   # account ID
    --kind <kind>   # proposal kind: file, block, draft
    --payload <json>   # proposal payload as a JSON object
quox mail resolve <proposalId>   # Approve or deny a proposal
    --decision <decision>   # approve or deny
quox mail undo <moveId>   # Undo a recorded move: reverse the IMAP move back to its source folder
quox mail watch active <watchId>   # Enable or disable a watch
    --set <bool>   # true or false
quox mail watch add   # Add a watch
    --label <label>   # watch label
    --match <json>   # match rule as a JSON object
    --account <id>   # restrict the watch to one account
quox mail watch list   # List watches
    --active-only   # only show active watches
```

### quox calendar

- Calendar-Q: connected calendars, agenda, coverage, sync

```
quox calendar agenda   # Show a connection's agenda: occurrences plus coverage state
    --connection <id>   # Calendar-Q connection ID
    --layers <csv>   # comma-separated layer ids to restrict to
quox calendar coverage   # Show just the coverage/freshness state for a connection
    --connection <id>   # Calendar-Q connection ID
quox calendar layers   # List Calendar-Q layers
quox calendar propose   # Propose creating a single, non-recurring event (no external effect — nothing is created yet)
    --connection <id>   # Calendar-Q connection ID
    --title <title>   # Event title
    --timezone <tz>   # IANA timezone
    --start <iso>   # Start time, ISO 8601 (omit for --all-day)
    --end <iso>   # End time, ISO 8601, must be after --start (omit for
    --all-day   # Create a single-day all-day event
    --date <date>   # 'YYYY-MM-DD', required with --all-day
    --attendees <csv>   # comma-separated attendee emails
    --notify <policy>   # 'none' or 'attendees' (default: "none")
    --visibility <visibility>   # 'default', 'private', or 'busy-only' (default:
    --description <text>   # Event description
quox calendar receipts   # Show Calendar-Q write-path receipts (newest first), each with its full state timeline
quox calendar reconcile <opId>   # Resolve an 'attempted' or 'outcome_unknown' create against provider evidence (read-only — never creates/updates/deletes)
quox calendar status   # Show connected Calendar-Q connections and their sync watermark
quox calendar sync   # Trigger a manual sync for a connection (respects retired/backoff eligibility)
    --connection <id>   # Calendar-Q connection ID
```

### quox voice

- QuoxVoice telephony

```
quox voice calls   # List recent calls for the active org (summary + turn count)
    --limit <n>   # max calls to return (1-200, default 50)
quox voice identities list   # List caller number to user mappings for the active org
quox voice identities remove <number>   # Remove a caller number mapping from the active org
quox voice identities set <number> <userId>   # Map a caller number (E.164) to a user in the active org
    --label <text>   # human label for the mapping
quox voice insights   # Show aggregate call insights for the active org
quox voice numbers list   # List numbers bound to the active org
quox voice numbers remove <number>   # Unbind a number from the active org
quox voice numbers set <number>   # Bind a number (E.164) to the active org, optionally with a label and policy
    --label <text>   # human label for the number
    --policy <json>   # policy as a JSON object (merged over the current
    --brand <text>   # policy: brand name the line answers as
    --opener-name <text>   # policy: name used in the call opener
    --ivr <on|off>   # policy: IVR menu on or off
    --voice <text>   # policy: voice to speak with
    --language <text>   # policy: language
    --persona <text>   # policy: persona
    --verbosity <quiet|verbose>   # policy: how chatty the agent is
```

### quox quoxchat

- Manage QuoxChat website widgets

```
quox quoxchat availability <widgetId>   # Show or set operator availability for a widget (QuoxChat Pro)
    --online   # mark the human operator online
    --offline   # mark the human operator offline
quox quoxchat conversations <widgetId>   # List conversations for a QuoxChat widget (live-support desk)
    --status <status>   # filter by conversation status (active, handed_off, closed)
    --waiting   # show only conversations waiting on a human reply
    --include-test   # also list simulation (sim_*) and test conversations
quox quoxchat reply <widgetId> <conversationId> <message...>   # Send an operator reply in a handed-off QuoxChat conversation
quox quoxchat transcript <widgetId> <conversationId>   # Print a conversation transcript in chronological order
    --full   # do not truncate long messages in table output (JSON output is
quox quoxchat widgets   # List QuoxChat widgets for the active org
```

### quox qlarity

- Qlarity: open a page, ask it a question, keep the receipt

```
quox qlarity console <url>   # One-shot: open a page, print its console log, close
    --wait-until <cond>   # navigation wait: load | domcontentloaded | networkidle
    --settle <ms>   # extra settle time after navigation, ms
    --session <id>   # reuse an existing session instead of opening a fresh one
    --json   # raw JSON output
quox qlarity network <url>   # One-shot: open a page, print its network log, close
    --wait-until <cond>   # navigation wait: load | domcontentloaded | networkidle
    --settle <ms>   # extra settle time after navigation, ms
    --session <id>   # reuse an existing session instead of opening a fresh one
    --json   # raw JSON output
quox qlarity origins add <origin>   # Declare an origin this org may inspect, e.g.
    --note <text>   # why it is allowed, shown alongside it later
quox qlarity origins list   # Show this org's declared origins, and the install-wide ones
quox qlarity origins remove <origin>   # Stop allowing an origin
```

### quox seo

- QuoxSEO: the URL warehouse with a witnessed history

```
quox seo backlinks [competitor]   # Referring-domain profile, or the link gap against a competitor (no argument shows our own profile)
quox seo coverage   # Google index coverage: what's indexed, and where Google disagrees with the page
    --filter <f>   # indexed | not-indexed
    --limit <n>   # max rows (default: "30")
quox seo gaps [competitor]   # Competitor keyword and page gaps against the latest witnessed crawl (no argument lists known competitors)
quox seo health   # Backend health through the governed proxy
quox seo keywords   # Stored keyword universe for the org's primary property (DataForSEO)
    --limit <n>   # max rows (default: "200")
quox seo remove-site <site>   # Remove a registered site and its warehouse data for this org (governed, witnessed).
    --yes   # skip the confirmation prompt
quox seo report deliver   # Deliver the latest SEO report (email via instance SMTP and/or the inbox; witnessed)
    --recipient <email>   # who receives the email (default: your account email)
    --org <id>   # org whose warehouse to report on (default: your session
    --channels <list>   # comma-separated: email,inbox (default: server default)
quox seo trends   # GSC winners & losers over time (period compare: last 28d vs prior 28d)
    --scope <s>   # url | query (default: url) (default: "url")
    --limit <n>   # max movers (default: "25")
```

### quox x

- X (Twitter) posting: governed, HITL-approved via HITL Inbox

```
quox x media upload <path>   # Upload a local image/GIF/MP4 into your org's X media root (governed: entitlement + org-scoped + content-validated server-side).
quox x mentions   # Read recent mentions of the connected account.
    --since <tweet_id>   # only mentions newer than this tweet id
quox x search <query>   # Search recent tweets (last ~7 days, X search operators supported).
    --count <n>   # results to return, 1-20 (default 10)
quox x timeline   # Read recent posts from the connected account's timeline.
    --count <n>   # posts to return, 1-20 (default 10)
    --user <user_id>   # read another user's timeline instead of the connected
```

### quox youtube

- YouTube uploads, thumbnails, comments and reads: writes are governed and HITL-approved via HITL Inbox, on your own vaulted Google credential

```
quox youtube thumbnail <videoId>   # Set a custom thumbnail on an existing video from an image under the org media root.
    --image <path>   # image path (.jpg/.jpeg/.png, max 2MB), relative to the org
```

### quox discord

- Quox Discord Pro daemon: status | instances | bindings | gaps | health | doctor | bind | unbind | provision

```
quox discord doctor   # per-binding view/webhook/liveness check (exits non-zero if any binding is broken)
quox discord provision <agentId> [args...]   # create/reuse a channel AND bind it
    --dry-run   # print exactly what it WOULD do, change nothing
```

### quox vault

- Manage QuoxVault credentials

```
quox vault cross-org   # Find credentials of a type across every org you belong to (no secrets returned)
    --type <type>   # integration type to look up
quox vault delete <id>   # Delete a credential
    --force   # skip confirmation
quox vault folder delete <folderId>   # Delete a credential folder (its credentials move to no-folder)
    --force   # skip confirmation
quox vault get <id>   # Show credential details
quox vault migrate   # Migrate legacy instance_config keys to QuoxVault
    --dry-run   # show what would be migrated without making changes
quox vault repos <id>   # Show or set which repositories a credential covers (GitHub and similar)
    --set <patterns>
    --clear   # remove the repository scope, so only the org default reaches
quox vault test <id>   # Test a credential connection
quox vault update <id>   # Update a credential (interactive label/description fields, or headless credential field values via --credentials-file/--credentials-stdin)
    --label <label>   # new label
    --description <desc>   # new description
    --kind <kind>   # credential_kind to record on the credential, if the
    --credentials-file <path>   # JSON object of {field: value} for the credential
    --credentials-stdin   # read that same JSON object from stdin (never
```

<!-- /coverage-ref -->
