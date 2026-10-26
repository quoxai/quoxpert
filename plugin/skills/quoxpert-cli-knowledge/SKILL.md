---
name: quoxpert-cli-knowledge
description: "Reference for the `quox` verbs over Quox knowledge stores: agent memory, the
  Brain/Qortex vaults and notes (search, brief, decide, distill, cite),
  knowledge-graph entities, files, tags, conversations, the Action Tracker and
  NotesQ. Load when a task is \"search my notes\", \"remember this\", \"list
  conversations\", \"add an action item\"."
argument-hint: "<task, e.g. 'which flags does X take'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard (cli/)
    sources:
      - repo: quox-dashboard
        cmd: "quox <domain> --help (walked recursively by quoxpert-coverage)"
license: LicenseRef-SkillRights-Reserved-1.0
---

# Quoxpert CLI reference: Knowledge, memory and files

Command reference generated from the live `quox` help tree. It lists the verbs that no hand-written recipe in the other quoxpert skills teaches yet. For concepts, approval flow and gotchas load `quoxpert-cli` first.

- Usage is `quox <verb> <args>`; `<arg>` is required, `[arg]` is optional, flags are indented under their verb.
- Add `-o json` for machine output (`table`, `json`, `csv`, `quiet`).
- Writes that are destructive or sensitive are held for human approval: report "awaiting approval", never "done".
- Never pass a secret as an argument: use the verb's stdin or file option.
- Regenerate with `quoxpert-coverage --regen-refs`; verify with `quoxpert-coverage` (fails on any stale verb or flag).

<!-- coverage-ref: memory,brain,entity,file,tag,conversation,actions,notes -->

### quox memory

- Manage memories

```
quox memory delete <id>   # Delete a memory
    --hard   # permanently delete (no soft-delete)
quox memory export   # Export all memories
    --format <fmt>   # export format (default: "json")
quox memory forget <id>   # Forget one of your memories (soft delete).
    --permanent   # permanently erase the memory (no soft-delete); cannot be undone
    --yes   # confirm forgetting
quox memory get <id>   # Get memory details
quox memory history <id>   # Full change history of one belief, oldest first, with reasons
quox memory reinstate <id>   # Undo a wrong correction: make a replaced belief current again
quox memory stats   # Show memory statistics: the whole org by agent and writer (org admins), else your own
    --mine   # only memories written under your own login
quox memory timeline [query]   # Decisions that changed over time (newest change first)
    --limit <n>   # max decisions (default: "20")
quox memory unpin <id>   # Take a memory out of the core set (also stops it being auto-promoted)
quox memory update <id>   # Update a memory
    --content <text>   # new content
    --tags <tags>   # new tags (comma-separated)
```

### quox brain

- Query Quox Qortex (vaults, notes, semantic search)

```
quox brain add [text]   # Save text (or clip a URL) into your brain as a note
    --title <title>   # note title
    --url <url>   # source URL (clipped server-side if no text is given)
    --tag <tag>   # tag (repeatable) (default: [])
quox brain brief   # What is new in your brain (counts by source, top new notes, open questions)
    --since <window>   # time window, e.g. 24h, 7d, 90m (default: "24h")
    --stream <id>   # narrow to one roadmap stream (QuoxPlan stream id, e.g.
quox brain citations   # Show persisted agent citations (what was cited, and whether it was supported)
    --session <id>   # only this session / turn id
    --limit <n>   # max rows (default 50, cap 200) (default: "50")
quox brain delete <noteId>   # Delete a note (recorded as a revision, restorable in NotesQ).
    --yes   # confirm deletion
    --expected-hash <hash>   # the note's content_hash you read (see `quox brain
quox brain eval   # Replay your judged queries against live search and score retrieval (hit@1/3/k, MRR, abstention)
    --limit <n>   # max judgements to load (default: "1000")
    --k <n>   # results fetched per query (default: "8")
quox brain export   # Export your visible notes (jsonl to stdout/--out file, or markdown files into --out dir)
    --out <path>   # file (jsonl) or directory (markdown); default stdout for
    --format <fmt>   # jsonl or markdown (default: "jsonl")
    --scope <scope>   # org | user | shared (default: all visible)
quox brain judge <query> [noteId]   # Label a query: a note is relevant/irrelevant for it, or the query should abstain
    --relevant   # this note is a correct answer for the query
    --irrelevant   # this note should not surface for the query
    --should-abstain   # nothing in the brain should answer this query
quox brain judgements   # List your relevance judgements (the eval set)
    --limit <n>   # max rows (default 200, cap 1000) (default: "200")
quox brain neighbours|neighbors <noteId>   # Notes this note links to and notes that link to it (graph neighbours)
quox brain source <type>   # Turn a Feed source on or off and set its config (host paths need an org admin and the instance allow-list)
    --enable   # turn the source on
    --disable   # turn the source off
    --scope <scope>   # org or user
    --path <path>   # set config.path
    --roots <paths>   # set config.roots (comma-separated absolute paths)
    --config <json>   # merge a JSON object into the config
quox brain subscribe <topic>   # Tell a slot when new notes about a topic land in your brain
    --slot <name>   # slot to notify
quox brain subscriptions   # List your topic subscriptions
quox brain suggest   # Suggest questions to ask the brain, generated from your own notes
quox brain unsubscribe <id>   # Remove a topic subscription
quox brain update <noteId>   # Replace a note's markdown from a file.
    --file <path>   # file holding the full new markdown
    --base-hash <hash>   # content_hash you read (see `quox brain read`); omit to use
quox brain vaults   # List brain vaults
quox brain why <queryOrTarget> [noteId]   # Two modes.
```

### quox entity

- Manage entities in the knowledge graph

```
quox entity create   # Create an entity
    --type <type>   # entity type
    --name <name>   # entity name
    --metadata <json>   # metadata as JSON
quox entity delete <id>   # Delete an entity, soft by default (also removes its relations)
    --hard   # permanently delete, no soft-delete
quox entity get <id>   # Get entity details
quox entity list   # List entities
    --type <type>   # filter by type
    --limit <n>   # max results (default: "50")
quox entity relate <fromId> <toId>   # Create a relation between entities
    --type <relType>   # relation type
quox entity search   # Search entities
    --query <q>   # search query
    --type <type>   # filter by type
quox entity unrelate <relationId>   # Delete a relation between entities, soft by default
    --hard   # permanently delete, no soft-delete
```

### quox file

- Manage files

```
quox file assign [fileId]   # Assign a quarantined file to an org (instance admin only; witnessed): <fileId> --org <orgId>, or --from-report <dry-run.json>
    --org <orgId>   # org that owns the file
    --from-report <path>
quox file delete <fileId>   # Delete a file
quox file download <fileId>   # Download a file
    --dest <path>   # write the file to this path (the global -o/--output sets output
quox file list   # List files
quox file quarantine
quox file stats   # Show file storage stats
quox file upload <path>   # Upload a file
    --name <name>   # override filename
```

### quox tag

- Manage tags

```
quox tag create   # Create a tag
    --name <name>   # Tag name
    --color <color>   # Tag color (hex)
quox tag delete <tagId>   # Delete a tag
    --force   # skip confirmation
quox tag list   # List tags
quox tag update <tagId>   # Update a tag
    --name <name>   # New name
    --color <color>   # New color
```

### quox conversation

- Manage conversations

```
quox conversation get <id>   # Show a chat conversation's turns; --archive reads the imported conversation archive
    --limit <n>   # Max turns (chat only) (default: "50")
    --archive   # read the imported conversation archive instead of chat
quox conversation list   # List your chat conversations (newest first); --archive lists the imported conversation archive
    --limit <n>   # Max results (default: "20")
    --offset <n>   # Skip results (archive only) (default: "0")
    --archive   # list the imported conversation archive instead of chat
quox conversation search   # Search conversations
    --query <q>   # Search query
    --limit <n>   # Max results (default: "10")
quox conversation stats   # Conversation statistics
```

### quox actions

- Action Tracker items: list, get, add, done, move, delete (edit in chat or the dashboard)

```
quox actions add <text...>   # Add an Action Tracker item (todo) as the logged-in user
    --due <date>   # YYYY-MM-DD, today or tomorrow
    --priority <priority>   # one of low, medium, high, urgent
    --description <text>   # longer notes
quox actions delete <id>   # Delete one of your Action Tracker items (asks first; --yes skips, required without a terminal)
    --yes   # do not ask
quox actions done <id>   # Mark an Action Tracker item done
quox actions get <id>   # Show one action item by id
quox actions list   # List action items
    --status <status>   # todo, doing, done or all (default: "all")
    --limit <n>   # page size (1-100); every page is listed (default: "100")
    --scope <scopeId>   # only items in this team/department/division scope
quox actions move <id> <status>   # Move an Action Tracker item to todo, doing or done
```

### quox notes

- NotesQ: governed markdown notes (list, read, write, history, restore)

```
quox notes schedule ls   # List your note schedules
quox notes schedule pause <id>   # Pause a schedule
quox notes schedule resume <id>   # Resume a schedule (clears its failure count)
quox notes schedule rm <id>   # Delete a schedule (notes it already made are kept)
quox notes settings list   # List NotesQ settings for the active org
```

<!-- /coverage-ref -->
