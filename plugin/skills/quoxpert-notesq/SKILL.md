---
name: quoxpert-notesq
description: "Make any Claude fluent at NotesQ, the governed markdown notebook
  layer of Brain2 ($19 plugin). Notes are markdown with properties (collection,
  tags, pinned, archived), org or user scoped, revisioned, with
  optimistic-concurrency edits (409 on a stale base). Load when a session should
  list, read, create, edit, tag, append, duplicate, attach, export, import,
  restore or delete notes, change NotesQ settings, check its licence, talk to the
  NotesQ agent, link a human to a note, or write many notes at once from a
  session (batch, split, loop on a subject, undo a batch). Everything is doable from the terminal.
  NOT for code search (repobrain owns that) or knowledge search across Brain2
  sources (`quox brain search`)."
argument-hint: "<task, e.g. 'tag a note', 'export my notes', 'import an Evernote file', 'set agent edits read-only'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard
    stream: AQ-9D
license: LicenseRef-SkillRights-Reserved-1.0
---

# NotesQ

**Markdown notes, governed: every write is a revision, every stale edit is a 409, every write is evidence.**

## What it is

The notebook layer of Brain2. Notes live in quoxbrain (app `notesq` vaults,
scope `org` or `user`); the CLI talks only to the collector,
`/api/v1/notesq/*`, which resolves org and user from auth, checks the licence
(governed since 2026-10-07: `notesq@orgs=N`), and witnesses writes as
`quox.notes.*` envelopes naming the REAL actor (`human.<id>` or `agent.<id>`),
never note content. Content is markdown with YAML frontmatter properties.

## The owner works terminal-first. Every NotesQ task has a verb.

```
# read
quox notes ls [--scope org|user|all] [--q text] [--collection c] [--tag t] [--pinned] [--archived exclude|only|include] [--limit n] [--props a,b]   # --props adds front-matter property columns (also on search)
quox notes search "runbook"
quox notes show <id> [--raw]                     # prints the /notes?note=<id> link too
quox notes facets [--scope org]
quox notes history <id>
quox notes related <id>
quox notes attachments <id>                      # files referenced by the note

# write (each one is a revision; 409 = the note moved on: re-show, merge, retry yourself)
quox notes new --scope org|user --title "Plan" [--collection c] [--tag t]... [--file f | --stdin]
quox notes edit <id> --file draft.md [--collection c] [--tag t]   # replaces the body; --tag replaces tags
quox notes append <id> "one more line"           # or --stdin / --file
quox notes tag <id> [--add t]... [--remove t]... [--collection c|--no-collection] [--pin|--unpin] [--archive|--unarchive]
quox notes duplicate <id>                        # "(copy)", keeps collection/tags, drops import bookkeeping
quox notes attach <id> photo.png                 # uploads (25 MB cap), appends the image/file link
quox notes restore <id> --rev 2                  # writes a NEW revision with rev 2's content
quox notes rm <id> --yes                         # soft delete, restorable; author or org admin
quox notes rm <id> --yes --purge                 # PERMANENT erase incl. history; HUMAN session only

# move data in and out
quox notes import <file.enex|vault.zip|notion.zip|.md> --dry-run      # always dry-run first
quox notes import <file> [--scope org|user] [--collection X]          # prints the job id
quox notes import-status <jobId>                 # re-check a job after a disconnect
quox notes download <fileId> [--out path] [--force]
quox notes export [--scope ...] [--collection c] [--tag t] --out notes.zip [--with-attachments]
#   --with-attachments = complete offline copy: files in _attachments/, links rewritten

# templates + scheduled notes (server-side, your time zone)
quox notes templates                             # built-ins: daily, weekly, meeting, decision; plus your notes with property template: true
quox notes new --template daily [--scope user] [--collection Daily]   # {{date}} {{weekday}} {{time}} {{week}} {{year}} {{title}} filled in
quox notes schedule add --template daily --at 07:30 [--weekly fri] [--tz Europe/London] [--scope user] [--collection Daily] [--title "Standup {{date}}"]
quox notes schedule [ls] | pause <id> | resume <id> | rm <id>   # one note per period, never doubled; 10 straight failures pause it

# AssistantQ wires (compose at the edge: read via the other plugin's route, write via NotesQ)
quox notes from-email <inbmsg_id> [--scope user|org] [--collection c] [--tag t]   # InboxQ email -> note (default personal); fetches body on demand
quox notes actions <id> [--priority p] [--yes]   # open tasks (- [ ] ...) -> Action-Q items linking back; re-runs skip sent ones
quox notes promote <id> --stream <streamId>      # appends a QuoxPlan stream note (title, link, excerpt); records promoted_to

# bulk authoring from a session (one governed job, max 200 notes, dry run unless --yes)
quox notes batch <folder|file.jsonl|-> [--scope org|user] [--collection c] [--session label] [--yes]
#   folder: .md files, frontmatter title/collection/tags/key; JSONL lines {title, markdown, collection?, tags?, key?}
#   every note gets tag batch-<8 hex> + batch_id (+ batch_session); re-running the same batch skips existing notes (key, else root/path; JSONL key defaults to title)
quox notes batch-undo <batchId> [--yes]          # lists, then soft-deletes exactly that batch (matches batch_id, not just the tag)
quox notes split <id> [--level n] [--yes]        # headings become child notes (one batch), the original becomes a [[link]] index; prints the two-step undo
quox notes suggest <id> [--limit n]                # P5: other notes whose title appears as plain text in this one (mentions), then related-but-unlinked notes. Same notebook only (links never cross scopes)
quox notes suggest <id> --link <targetId>          # rewrite the first plain mention (never the note's own H1) into [[Title]], with base_hash
quox notes health [--scope org|user] [--stale-days n]  # exact/same-title/similar duplicates, stale-but-linked notes, broken [[links]]; dashboard twin: Health button, /notes?health=1
quox notes propose-skill <id> [--name n] [--category c] [--yes]   # P5: note becomes an EXPERIMENTAL skill (tag source:notesq:<id>); safety judge reviews it; NOT a human gate before running
# Research into a note: ask the Notes-Q agent (quox chat --agent notesq "research X and save a note with sources"); it calls notesq_research -> SCHOLAR with the model's own web search (routing: org LLM policy, capability research). If no search is available it says so instead of writing from memory.
# Gotchas (2026-10-10): a research-then-save turn takes ~150s on Claude (CLI turn limit 285s). Running as the dev box resident identity, saves go to Approvals by design (not a human); a human login skips approval for safe asks. Before 2026-10-10 the default (streaming) `quox chat` gave agents no prompt/tools on Claude; if a session sees an agent guessing tool names, check the collector is current.
# Dashboard twins: details rail Split section + Undo batch; notes pane List/Table/Cards/Timeline switch (deep link /notes?view=table|cards|timeline).

# settings, licence, agent, proof
quox notes settings                              # NOTESQ_* values for this org
quox notes settings set agent-edit-policy read_only   # needs a HUMAN org admin (e.g. quox -p moo ...)
#   keys: autosave-ms | default-collection | agent-edit-policy (direct|propose|read_only) | revision-retention (0 = keep all)
#   propose = an agent change made on its own files an Approvals card with a line diff and runs only on approval (quox -p moo inbox ls|show|respond); a direct request in your own chat is the approval; delete always asks
quox plugin licence notesq                       # governed? entitled? band (notesq@orgs=10)? org seats used
quox chat --agent notesq --no-stream "jot this down: ..."
quox aee query --intent quox.notes --limit 20    # evidence; corr = note id
quox notes scorecard                             # live proof run, ~10-15 min, cleans up after itself
```

Global `-o json` works everywhere; for `download`/`export` use `--out` (the root `-o` is the output format).

## Recipe: loop on a subject (session authoring)

1. Draft an outline note: `quox notes new --scope user --title "<Subject>" --file outline.md` (one `##` per part).
2. Write the parts as files in a scratch folder named after the subject (frontmatter `title`, `collection`, `key: <subject>-<part>`), link siblings with `[[Title]]`. Research from Brain2 (`quox brain search`) or the session's own work; never invent facts.
3. `quox notes batch <folder>` (read the dry run), then `--yes`. Keep the printed batch id.
4. Rewrite the outline as the index (`quox notes edit`), or `quox notes split <id>` when the outline already holds the content.
5. Go deeper on a part: edit its file, re-run is safe (existing keys are skipped), or start a new batch for the sub-parts.
Anything wrong: `quox notes batch-undo <batchId> --yes` and every note of that batch goes (revisions kept).

## Deep links for humans

`/notes?note=<id>`, `/notes?import=1` (Import dialog), `/notes?layout=filters,list,focus,agent`, `/brain2?note=<id>`, Settings section `#notesq`.

## Gotchas (keep current)
- **The `quox` CLI on <dev-box> is the Resident AGENT identity** (`quox whoami`: Actor Type agent). Its writes are agent-authored, evidenced as `agent.<id>`; it cannot purge or change settings. Use the owner's human profile (`quox -p moo ...`) for those, with the owner's say-so.
- **Expired profile + service key in the env = wrong org.** With `QUOX_SERVICE_KEY`/`QUOX_ORG_ID` exported, an expired `-p <profile>` session silently runs as the box in the env org. Run cross-identity checks with those unset (`env -u QUOX_SERVICE_KEY -u QUOX_ORG_ID quox -p ...`).
- **Org seats:** the licence covers N orgs per plugin; any org claims a seat on first use. A 402 cannot be provoked on the owner's instance. `quox plugin licence notesq` shows seats used.
- **Cross-org test identity:** profile `isotest-b` (its own org, not a member of QUOX DEVELOPMENT). Sessions expire after about 2h: `quox -p isotest-b login --email ... --password-stdin`.
- Agent edits: `direct` (the user's command is the authorization), `propose` (unprompted agent edits arrive as Approvals diffs; live-proven 2026-10-09: card, then approve, then revision written via resume) or `read_only`.
- **Attached session = the NotesQ agent.** `quox agent attach notesq` leases the agent for this session (`attach-status`, `attach-heartbeat`); `quox agent exec notesq --tool notesq_create --input '{"title":"...","markdown":"...","scope":"org"}'` runs a tool AS the agent, witnessed. A write from an attached session is agent-initiated, so it lands in Approvals (the platform cannot see that a human typed the ask); the human approves it with `quox -p moo inbox respond <id>` or in Approvals.
- **Approvals expire after 1 hour** (one lifetime for every tool, `services/collector/lib/approvalTtl.js`). Past that the card closes itself and a late Approve answers "This approval had expired, so nothing ran" (before 2026-10-10 it looked approved and silently did nothing). Re-ask the agent to get a fresh card. `quox inbox show <approvalId>` 404s for these: tool approvals live in the collector's tool_approvals store, the inbox card has its own item id.
- **Agent-edit bar:** an agent revision shows "Edited by an agent", View changes and Undo above the note (Undo = restore, itself undoable). It renders a few seconds after the note on a busy box; screenshot with `--wait-ms 10000`, not `--wait-for '[data-testid="nq-agentbar"]'` (that waits too briefly).
- **Text size** is per device (localStorage `quox.notesq.textZoom`), so a CLI or a fresh browser always starts at 100%. The look (slate, tinted toolbar, pane rails, text size) is now global; see the glass-design-system skill, "The NotesQ look".
- Cortex/CommanderQ `brain_save` writes into the caller's PRIVATE NotesQ notebook (evidenced as `quox.notes.create` from that agent). Voice "note this" uses it.

## Honest limits

- Same-org other-user personal-note isolation is unit-tested; the live run needs a second VERIFIED user.
- `related` is lexical until embeddings are backfilled, then hybrid.
- Import has been driven with format-faithful fixtures, not yet a real Evernote/Notion export.
- Full maturity map: `quox-dashboard/docs/STATUS_AND_LIMITS_NOTESQ.md`. Findings ledger: `~/NOTESQ_FINDINGS_LEDGER_2026-10-07.md`.
