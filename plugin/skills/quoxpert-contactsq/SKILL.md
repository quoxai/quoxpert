---
name: quoxpert-contactsq
description: "Make any Claude fluent at ContactsQ, Quox's governed contacts layer
  (the sibling of QuoxVault: Vault leases secrets, ContactsQ leases PEOPLE). Agents
  never hold a raw phone number or email: they get masked cards, and transports
  (the voice bridge, the email/SMS sender) redeem single-use INJECT leases. Covers
  `quox contacts` (add/search/resolve/call/import/merge/facts/consents/erase/dsar/
  grants/settings/rewrap), the agent tools (contacts_*), the approval-gate and
  standing-grant model, the uk-pecr-gdpr reachability policy engine, GDPR ops
  (crypto-shred erasure, tombstones, DSAR, retention reaper), and the dashboard
  /contacts. Load when a session must find/add/call/email a person, record an
  objection, answer a DSAR, erase someone, import an address book, or debug why a
  call or send was refused."
argument-hint: "<task, e.g. 'call Sarah', 'why was this dial refused', 'erase this contact', 'import contacts.csv'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard
    stream: CONTACTSQ
license: LicenseRef-SkillRights-Reserved-1.0
---

# ContactsQ

**Contacts for agents, leased not given.** The only way a Quox agent reaches a human is through ContactsQ, so consent and policy are enforced at the gate and every use is witnessed. Source of truth for maturity: `quox-dashboard/docs/STATUS_AND_LIMITS_CONTACTSQ.md`. Plan: `~/CONTACTSQ_PLAN_2026-10-08.md`; stream CONTACTSQ (#512) in QuoxPlan.

## Where it lives
- Collector-resident (no own container): `services/collector/lib/contactsq/*`, SQLite `CONTACTSQ_DB_PATH` (default `/var/lib/quox/contactsq.db`, in the backup manifest). HTTP `/api/v1/contactsq/*`. Agent tools `services/collector/lib/contactsqTools.js`. CLI `cli/lib/commands/contacts.js`. Dashboard `src/components/contactsq/` at `/contacts` (deep links `?contact=<id>&pane=overview|reach|consent|timeline|relationships|facts|privacy|edit`, `?tab=people|suppressions|grants|compliance|settings`; Call places a governed human dial).
- Voice consumer: quox-voice `quox_voice/contacts.py` (caller-ID greeting, suppressions) and `contact_dialer.py` (the bridge LONG-POLLS `/leases/dial-queue`; the collector container cannot reach the voice services, they bind 127.0.0.1).

## Who can do what (the actor matters)
- The box's default CLI profile is the RESIDENT AGENT identity (`quox whoami` -> Actor Type agent). Human-only verbs (`show --full`, leases, grants, consents write, erase, dsar, compliance, settings PUT, rewrap) correctly 403 it. Use the owner's human profile: `quox -p moo contacts ...` (it may need `quox -p moo login`). Do not "fix" a 403 for the agent identity; it is the design.
- Service key callers (the voice bridge) pass `org_id` in the body (house pattern).
- A session ATTACHED as the contactsq agent (`quox agent attach contactsq`) should `export QUOX_AS=contactsq` (or pass `--as contactsq`): plain `quox contacts ...` verbs then run AS the agent (whoami shows contactsq) and are witnessed under it; without it they run as the resident identity (quox#772, shipped 2026-10-11). `quox agent exec contactsq --tool <name> --input '<json>'` also acts as the agent.

## Common recipes
```
quox contacts add --given Sarah --family Lee --nickname Sal   # structured names; a bare <name> still works (split: last word = family)
quox -p moo contacts edit <id> --given ... --family ... --display ''   # '' clears a display-name override
quox contacts add --given Ann --family Lee --organisation "Acme" --job-title CTO   # every contact has a name AND an organisation (found by name or created, linked works_at)
quox -p moo contacts edit <id> --organisation ''   # clears it ; --organisation X --job-title Y moves/changes
quox contacts search "sarah"                 # phonetic (Sean/Shawn/Shaun), flags ambiguity: ask, never guess
quox contacts resolve +447700900123 --greeting
quox -p moo contacts call <id> --reason "..."   # human dial: the phone bridge redeems the lease and rings
quox -p moo contacts show <id> --full        # raw identifiers, human only
quox -p moo contacts import file.csv         # DRY RUN by default; add --commit
quox -p moo contacts merge <survivor> <loser> --yes ; quox -p moo contacts unmerge <merge-id>
quox -p moo contacts dsar <id> > dsar.json
quox -p moo contacts erase <id> --scope full --reason <code> --yes   # IRREVERSIBLE crypto-shred + tombstone
quox -p moo contacts unblock <phone|email> --reason <code> --yes     # lift a tombstone for a returning person
quox -p moo contacts grant add quox --preset receptionist            # standing grant: 20 service calls/day, no ask
quox -p moo contacts retention status ; quox -p moo contacts retention run --dry-run   # NOTE: without --dry-run it REALLY erases
quox -p moo contacts rewrap                  # re-wrap keys/upgrade v1 ciphertexts; idempotent
quox -p moo contacts sync add --credential <vault-cred-id> --label iCloud [--every 360]   # CardDAV ONE-WAY pull (iCloud: kind carddav_account / type icloud_contacts, Apple ID + app-specific password)
quox -p moo contacts sync run <id> --dry-run ; quox -p moo contacts sync run <id>        # counts only; upstream delete FLAGS source_removed, never erases
quox contacts brief                          # morning brief: candidates to review, lapsing consents, overdue notices, duplicates, sync status (counts/ids only; agents allowed)
quox contacts selftest [--agent]             # 8 read-path checks on a demo contact (never dials/sends); --agent proves an attached session's tool scope
quox contacts handoff <id> "<note>" ; quox contacts handoffs <id>   # per-contact open-thread notes (encrypted; humans read text, agents see existence + age); shown as "Open threads" on the record
quox contacts focus                          # the contact a human has open in the dashboard right now (30 min TTL, in memory)
```
Attached-session loop (P8, 2026-10-11): `quox agent attach contactsq` -> `export QUOX_AS=contactsq` -> `quox contacts brief` -> work -> `quox contacts handoff` for every contact with an open thread -> `quox agent detach contactsq --handoff-text "..."`. Agent tools added: contacts_brief, contacts_handoff, contacts_handoffs, contacts_focus ("this person" = call it first), contacts_dial_batch / contacts_send_batch (up to 10 people, ONE approval card; policy-refused people are excluded and listed; each lease re-checked at mint; a standing grant covers a batch only if every item is allow and the whole batch fits the cap).
Import file sources (2026-10-10): iCloud vCard (Apple itemN.X-ABLabel labels, X-ABShowAs:COMPANY org cards, embedded PHOTOs stored on commit), Android 2.1 quoted-printable, Outlook CSV ("Title" = honorific when "Job Title" exists), LinkedIn Connections.csv (preamble skipped). Cap 50 MB. Sync never writes back; erased people's identifiers are never resurrected; local edits since the last sync are not overwritten.
Agent tools (granted to quox; read tools also inboxq, action-q): contacts_resolve, contacts_find, contacts_search, contacts_best_channel, contacts_timeline, contacts_log_touchpoint, contacts_record_objection (UNGATED: objections only reduce reach), contacts_propose_fact (lands 'proposed'), contacts_dial / contacts_send / contacts_context (GATED).

## Why was a call/send refused? (read the reason codes)
- An agent `contacts_dial`/`contacts_send` with no standing grant files an APPROVAL (the tool result is `status: pending_approval` with an id). A standing grant only skips the gate when the policy engine says `allow`.
- Policy pack `uk-pecr-gdpr` codes: `dnc`, `do_not_market` (marketing only; service still allowed), `no_marketing_consent`, `objected`, `consent_withdrawn`, `human_only` (agents denied), `quiet_hours` (21:00-08:00 Europe/London default -> approval for agent voice/SMS), `tps_not_screened`, `org_do_not_market` (inherited from the employer), `identifier_bounced`, `no_identifier`, `erased`, `deceased`. Check: `POST /contacts/:id/policy {purpose, channel}` or the dashboard "Can we reach them?" widget.
- `409 identifier_erased` = that number/email belongs to an erased person (tombstone): use `unblock` only if they legitimately returned.

## MCP
Shell-less Claudes reach ContactsQ through QuoxMCP with `QUOX_AGENT_ID=contactsq` (31 tools incl. all contacts_*; proven 2026-10-11, recipe in quoxpert-mcp 12b). Same gates: dial/send/context still file approvals.

## LUCID (AWARE)
ContactsQ heartbeats feed `contacts` from its 5-minute scheduler tick (counts in state of subject `contacts:status`) and raises asks only when it needs a person: `contacts:sync:<source_id>` (sync source retired), `contacts:retention` (reaper failed), `contacts:unknown-callers` (daily at most). Check with `quox lucid feeds` and `quox sitrep` (People area). Wording lives in services/collector/lib/lucid/registry/kinds/contacts.json; ids and counts only, never a name or number.

## Gotchas (each cost real time)
- In an org whose Default QuoxHat hat is CUSTOMISED, template upgrades never add the contacts tools: CommanderQ only sees them after `hat_propose_switch` to the Assistant hat (then `hat_load_bundle('contacts')`) or an admin hat edit.
- The OpenAI fallback dispatcher used to show pending approvals as an empty `tool_error`; fixed 2026-10-08 (`pending_approval`). If a model says a tool "failed" with no message, check the collector log for `_approvalId` resumes before believing it.
- A parallel session building the collector from a STALE worktree rolls ContactsQ code back on dev. If contacts features vanish, check `docker exec quox-collector ls lib/contactsq/` against main and rebuild from main.
- Collector event-loop stalls (LoopWatchdog) can delay the voice caller-ID lookup; the bridge waits 3s for the opener and passes a late name to the agent.
- Evidence (AEE/WARD) must carry ids/codes only. The no-PII invariant is pinned in `test/contactsq*.test.js`; never add a value, name or summary to an envelope payload.
- Master-key rotation: set new + PREVIOUS key, `contacts reindex`, then `contacts rewrap`. Suppressions/tombstones with no surviving identifier cannot be re-keyed (reported as `suppressions_unconvertible`): never drop `MASTER_ENCRYPTION_KEY_PREVIOUS` while any remain.

- `quox org switch <slug>` used to 403 `not_org_member` (it sent the slug as an ID); fixed 2026-10-09 (resolves slug/name). On an older CLI pass the org ID.
- qlarity's logged-in dev browser session is SHARED across sessions: a screenshot can catch another session's page (e.g. NotesQ). Re-shoot if the breadcrumb is wrong.
