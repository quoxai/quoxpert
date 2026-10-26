---
name: quoxpert-lucid
description: "Operate and develop LUCID, Quox's core, free situational awareness (one append-only journal, per-area plain-language situation, a Herald that speaks first, contradiction checks, a witnessed record of what it knew and told). Covers quox sitrep and quox lucid, the deck and /lucid page, the lucid agent, the phone read, the feeds (collector emit, plugin SDK aware, host gatherer, live tail), the registry that decides how things are said, the Herald and its call-safety rules, witnessing, performance and isolation rules, deploy, and gotchas from real incidents. Load when asked what needs the owner, to add or debug a LUCID feed, to change how LUCID words something, to tune the Herald, or to deploy it."
argument-hint: "<task, e.g. 'what needs me', 'add a feed', 'why did LUCID call me', 'deploy a registry change'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard
    sources:
      - repo: quox-dashboard
        path: docs/LUCID_ADDING_A_SOURCE.md
      - repo: quox-dashboard
        path: docs/LUCID_DEVELOPER_GUIDE.md
      - repo: quox-dashboard
        path: docs/STATUS_AND_LIMITS_LUCID.md
      - repo: quox-plugin-sdk
        path: docs/aware.md
    generated_at: 2026-10-11
    quox_version: ">=0.1 pre-1.0"
license: LicenseRef-SkillRights-Reserved-1.0
---

# Quoxpert: LUCID (situational awareness)

## What this is

LUCID is core, free, background awareness for the whole Quox system. It is NOT a paid plugin and it is NOT
on the command screen (owner decision). CommanderQ reads it in the background (a read-only `[SITUATION]`
block plus the `lucid_situation` and `lucid_item` tools). It answers: what needs me, what changed since I
last looked, what is in motion, and what can LUCID not see. It never changes anything by itself and never
says "all clear" when a feed is silent.

Stream: QuoxPlan `LUCID` (#517). Honest maturity: `docs/STATUS_AND_LIMITS_LUCID.md`. Last audit:
`docs/LUCID_AUDIT_2026-10-11.md` (re-audit 6.6/10). Announce with the QuoxGlyph line
`◉ LUCID │ <verb> │ <result>`.

## Surfaces (use these, in this order)

| Need | Command or place |
|---|---|
| Orient at session start, or "what needs me" | `quox sitrep` (also `--agent`, `--json`, `--spoken`, `--markdown`; never moves the cursor). Skill: `/sitrep` |
| Answer "sitrep" in a slot or Discord | `quox sitrep --markdown \| quox slot say <slot> - --session <S>` (owner 2026-10-17: never post the spoken paragraph to chat) |
| Since I last looked | `quox lucid` or `quox lucid since-last` (advances the cursor; `--no-advance` to peek), `quox lucid since 3h` |
| One item, full account | `quox lucid why <ref>` |
| What can I do about it | `quox lucid do <ref> <measure_id>` |
| One area | `quox lucid area <name>` |
| Health of the senses | `quox lucid feeds`, `quox lucid blind` (live, silent, failing, unwired, plus contradictions) |
| Time travel | `quox lucid replay --at <ts or "21:00">`, `quox lucid told --since 6h` (what LUCID told you, with witness ids) |
| Teach it | `quox lucid teach <target> <assignment>`, `quox lucid lessons`, `quox lucid forget <id>` |
| Herald | `quox lucid herald`, `quox lucid herald set <key>=<value>`, `quox lucid herald test` (dry run) |
| Live terminal | `quox lucid deck` |
| Ask in words | `quox lucid ask "..."` (the `lucid` agent, Experimental) |
| Raw | `quox lucid subjects`, `quox lucid journal`, `quox lucid ack <seq>` |
| Dashboard | `/lucid` page (Monitoring) and the Home sidebar situation. Never on the command screen |
| Phone | quox-voice reads the `.spoken` form per turn (drill-down by `item?ref=`) |

If `quox` says "fetch failed" on the dev box, export `NODE_EXTRA_CA_CERTS=~/.config/quox/quox-dev-edge.pem`.
Never use `NODE_TLS_REJECT_UNAUTHORIZED=0`.

## Architecture map (where things live)

Collector, `services/collector/lib/lucid/`:
- `journal.js`: append-only `aware_journal`, `aware_subjects` projection, feeds, cursors, lessons, Herald tables, PII scrub.
- `situation.js`: builds the situation (areas, needs-you, changed, in motion, cannot see) and renders human, compact and spoken forms.
- `explain.js` plus `registry/` (`areas.json`, `kinds/*.json`, `impact.json`, `measures.json`): turn subjects into ItemCards. Wording is DATA.
- `routes.js`: the HTTP surface, memo, ETag, slim wire, user-write confinement, admin gating.
- `emit.js`: in-collector hooks (approvals, calls, security, builds, runs, email, messages) and the 60s heartbeats.
- `herald.js`: the escalation ladder. `epistemic.js`: silent/failing/unwired and contradictions. `witness.js`: WARD witnessing. `replay.js`: replay and told.
- `agentTools.js`: read-only tools for the agent. `compat.js`: old `/awareness` routes. `db.js`: the separate `lucid.db`.

Elsewhere: host scripts `scripts/lucid/` (`quox-lucid-gather`, `quox-lucid-tail`, `quox-lucid-herald`,
`quox-lucid-daily`, `install.sh`); CLI `cli/lib/commands/lucid.js` (the deck is in `cli/lib/lucid/`); UI
`src/components/lucid/` and `src/pages/views/LucidView.jsx`; the Claude Code hook
`~/.claude/hooks/lucid-session-activity.sh` (owner box); the plugin kit `@quox/plugin-sdk/aware`;
quoxify dimension 21 AWARE.

## Adding a feed or changing how something is said

Read `docs/LUCID_ADDING_A_SOURCE.md` first. It is the standard: decision tree, the four ways to feed LUCID,
the registry step, honesty rules, Herald implications, tests, definition of done and a checklist. A registry
change (`kinds/*.json`, `areas.json`, `impact.json`, `measures.json`) needs no code, but it is baked into the
collector image, so it still needs `quox-build collector`.

## Deploy

- Collector change (lib/lucid, registry JSON, server.js wiring): `quox-build collector`. Never run raw docker build or compose commands.
- Dashboard or UI change (`src/components/lucid`, `LucidView.jsx`): `quox-build dashboard`. Both: `quox-build both`. Progress: `quox-build status`.
- Never stop or restart the build daemon without the owner's yes and a reason.
- Host scripts (gatherer, tailer, herald, daily): `bash scripts/lucid/install.sh`. It COPIES the scripts to
  `~/.local/share/quox/lucid/`, installs the user units, enables the gatherer, herald and daily timers and
  restarts the tailer. Long-lived units must never exec from the working tree. After editing a script you
  must re-run install.sh or the live unit keeps running the old code.
- CLI changes: the global `quox` runs from the stable CLI worktree, not your branch. Verify through your own checkout (`node cli/bin/quox.js lucid ...`) before claiming it works.
- Storage: LUCID has its own SQLite file `lucid.db` beside `aee.db` (in the collector container, next to
  `/var/lib/quox/aee.db`). It was split out because its many small writes froze the collector inside the
  7 GB `aee.db`. First boot copies history once. The old `aware_*` tables in `aee.db` are inert.
- A green suite proves code, not deployment. After a deploy: `quox lucid feeds` (feeds live), `quox sitrep`
  (reads right), `systemctl --user list-timers 'quox-lucid-*'`.
- Restart-rearm trap: the Herald, epistemic watcher and heartbeats all start at collector boot. Before
  restarting a burning collector "to clear a wedge", check its boot path for startup-triggered schedulers.

## The Herald and its safety rules

Ladder per item that needs the owner, coalesced (an escalated item is updated, never re-fired):
L1 an Approvals-inbox item (the primary sink, filed in the collector); L2 one message to the `lucid` slot
(host runner); L3 a phone call via `quox-call-me` (host runner, opt-in).
Budgets: urgency now 5 min, today 60 min, this week 24 h; site down 2 min; security high or critical 0;
session waiting on the owner 15 min; gates mentioning deploy 10 min. `fyi` and `whenever` never escalate.

Safety rules (each exists because the 2026-10-11 audit found calls unsafe):
- Calls are controlled by `quox lucid herald set call=true` or `call=false`. They were turned OFF on audit,
  fixed, and turned back ON 2026-10-11 22:45 UTC. The first real call is still to be watched: when one
  happens, watch it. If anything looks wrong, turn `call` off first, then diagnose.
- Quiet hours (default 22:00 to 07:30 London) block slot nudges and calls. Only a site down or a
  HUMAN-VERIFIED security finding (status confirmed or verified) may break quiet hours, and only for the call.
- Caps: `call_per_hour` (default 1), `call_per_day` (default 3), at most 2 attempts per item with a 30 minute
  gap. `quox-call-me` exits 0 on no answer, so a call is judged by `owner_said`, not by exit code.
- Never calls for `run:*` failures or agent-filed (unverified) security candidates; those stay at the inbox.
  Approvals only ring when they gate a deploy, security or the site.
- The call brief uses only SAFE measures. Dangerous or gated commands are never read out.
- LUCID never decides or bypasses an approval. The HITL inbox is always first; do not add a channel that skips it.
- Loop hygiene applies: failures counted apart from "nothing due", capped backoff, durable retirement
  (resolved escalations are retired after a week).
- Before changing any Herald behaviour, run `quox lucid herald test` and read the dry run.

## Witnessing rules

- The journal is append-only. NEVER rewrite, delete or edit journal rows: they may be WARD-witnessed and a
  rewrite breaks the hash. PII is masked on read (`scrubPii`), not by editing history. Fix the writer.
- Witnessing is selective by design (WARD appends were already seconds of collector CPU): herald steps,
  briefings issued, epistemic facts, approval and security transitions. Never every heartbeat or session tick.
- The WARD hook is fire-and-forget. LUCID supplies an `event_id` (`LUCID_<type>_<org>_<n>`) and treats that
  id as the reference; a thrown sink error is a real failure. A readiness check guards against the sink not being wired.
- Witness failures are counted and surfaced as the epistemic fact `epistemic:witness`, never swallowed.
  The witness's own alarm is never witnessed.
- Every person-facing delivery is a witnessed "briefing issued" with the sha256 of the wire body, so
  `quox lucid replay` can prove what was told. Replay says plainly that feed health at that moment cannot be reconstructed.

## Performance rules (each from a real profile)

- Tail reads and a 10 s memo on the situation; any new journal row changes the memo key, so a real change is never hidden.
- A shared per-org core, so panels, decks, agents and the phone do not each rebuild the picture.
- Prepared statements cached per db handle; ingest in one transaction per post (a gatherer post carries hundreds of events).
- No-op write skipping: an identical repeat only refreshes `last_heard`. Never put volatile numbers in `summary`.
- Its own `lucid.db`, WAL, `synchronous = NORMAL`.
- Slim wire plus ETag: responses had grown to 313 KB per poll; clients fetch full cards via `/lucid/item`. An unchanged poll is a 304.
- Deck traps: the Ink deck once fetched on every redraw (refresh loop) and, with the development build of
  React, ran out of memory after 8.5 hours. It must fetch on mount and then only on its interval (pinned by a test).
- Slow collector? Read the `[LoopWatchdog]` lines first (they name the blocker), then CPU-profile. Do not guess.

## Security and isolation rules

- User writes (`POST /api/v1/lucid/events`) are forced onto feed `user:<id>` and confined to `user:` and
  `note:` subjects. Touching `security:`, `approval:` or any system subject is a 403. Snapshots,
  `expected_feeds` and `retired_feeds` are service-only.
- Host and service posts use `/api/internal/lucid/*` with the service key. Never print or log the key.
- Lessons (`teach`) are admin-gated for protected kinds: muting or re-rating `security` or `approval` items
  needs an admin or owner. The gate is default-deny (a user with no role is not admin).
- Cross-org lesson from the 2026-10-11 probe: the org comes from the auth context only, never from a request
  argument, in routes AND agent tools (`ctx.orgId`). Proven live in QuoxSecurity engagement
  `lucid-isolation-c1` (7 checks refuted). Any new route or tool must add a cross-org test.
- Security audit work runs inside a QuoxSecurity engagement from the first check, not as an ad hoc script.
- No PII in subject or summary (phone numbers, email addresses). Use `maskCaller`.

## Gotchas (from incidents)

- False reassurance is the worst failure. Partial coverage must never render green: an area is not ok just
  because ANY of its feeds spoke. Voice must say it could not reach LUCID, not "all clear", on a failed fetch.
- Dedupe merges items with the same L0 + kind + actor. Put the distinguishing name in the L0 or two different failures collapse into one line.
- Herald rows must refresh urgency each tick; a frozen urgency left L3 unreachable when L2 was unavailable.
- Old news must not rank today: contradictions older than 7 days drop to "this week", older than 21 days to
  "whenever"; DECISION_NEEDED streams parked over 30 days are not filed to Approvals.
- Zombies: `run:*` subjects retire after 6 h and `session:*` after 12 h without being heard, unless they carry
  a ttl. A snapshot from one feed does not retire subjects written by another feed's hook.
- A run ended by a collector restart is not a failure (interrupted), and a later success clears earlier
  failures of the same workflow or agent.
- Self-blindness: the gatherer and tailer report their own post failures as `lucid-gatherer` and `lucid-tail`
  heartbeats via the local ledger `~/.local/state/quox/lucid-pipeline.json`. Do not add an env-only override.
- SDK salience gap: `@quox/plugin-sdk/aware` demands boolean `salience.needs`; the collector keeps only a
  string `needs`, so SDK-sent salience is dropped. Use registry `needs_rules` instead.
- `run` measures return `manual` with the exact command: no approval filer is wired in `server.js` yet.
  Do not claim LUCID "fixes" things.
- LOOSEN-GUARD (pre-commit): changing an expected literal in a test needs `quox ask --yn --high-risk` approved with the owner's step-up PIN, then trailers `Loosening-Approved: <id>` and `Loosening-Attestation: <item.loosening_attestation>`. The attestation is only issued when the ask text names each file by FULL repo path (with a slash, e.g. `services/collector/test/lucidV2.test.js`). Bare file names give a null attestation and the owner has to approve twice (2026-10-17). Never route around the guard with setup-only edits or --no-verify.
- `quox-sentry` is DAEDALUS tooling (box watchdog). A timer-run unit (herald, gatherer, daily) that fails once is NOT dark: sentry now alerts only if it is still failed 15 min on (2026-10-17 false alarm after one herald run hit a collector restart). Its alerts go through LUCID; direct Telegram is a
  dead-man fallback only. `~/bin/quox-sentry` is not in any repo yet.
- Telegram/watchtower was retired from LUCID by the owner. Do not re-add a `telegram` feed.
- The template helper `plural` only appends `s`: pick nouns that pluralise that way (`caller`, not `person`).
- The slot listener must wake on ` discord ` AND ` say ` rows not written by LUCID or LUCID-HERALD (FROM starting `LUCID`; the Herald posts its own owner nudges there) and ignore `broadcast`. A Discord-only filter missed two owner `sitrep` asks sent with `quox slot say` from a Quoxon window (2026-10-16). Ack, re-arm, then work.
- `lucid-tail` silent for days with 401s in `journalctl --user -u quox-lucid-tail`: the service key rotated under a long-running tailer. Fixed in QUOXON-E2 (re-read key on 401/403); needs `bash scripts/lucid/install.sh` to load.
- `inboxq` "never heard" while mailboxes show polling: check `inboxq_settings.sync_enabled` (empty table = background sync off for every org). Since QUOXON-E2 the scheduler reports this as a failing inboxq beat instead of silence.
- Mission and gripes feeds (gatherer facets `mission` and `gripes`, area Mission): the Proof Matrix board (`QUOX_LUCID_MATRIX_URL`, default `http://127.0.0.1:4350/data.json`) gives `mission:matrix` plus `mission:regression:<domain>/<case>` for every case whose latest proof-engine verdict is fail (today) or partial (whenever); open issues via `gh issue list -R quoxai/quox` give `gripe:summary` plus at most 12 `gripe:<n>` (fresh security, fresh bugs, gripes linked from a failing case). Both are inbox-only in the Herald (`mission:` and `gripe:` never reach slot or call). A board or gh failure makes the feed FAILING (5 minute backoff), never "no gripes". The board link shown is this box's own address, computed at run time (override `QUOX_LUCID_MATRIX_VIEW_URL`); never bake a private address into the repo. Needs `install.sh` (gatherer) and `quox-build collector` (registry) to go live.
- Fixed security findings still alarming in sitrep (2026-10-19): a report-finding finding has no link to its issue or fix, so
  nothing closes it. Run `quox engagement reconcile --dry-run` then without `--dry-run` (add `--link FND_...=quoxai/quox#N` or
  `=<sha>` when the fix commit does not cite the finding id). A finding with a landed or deployed fix renders "fix deployed on dev,
  awaiting verification" (variant `fix_pending`, needs none). It resolves only on a closed issue AND a fix in the build tree; a
  critical never auto-resolves. Trail: `quox engagement reconciliations <id>`. Deployed means an ancestor of `~/.quox-build/quox-dashboard` HEAD.
- Path-looking titles come from systemd unit Descriptions that are script paths; explain.js falls back to the unit name (QUOXON-E2).

## Tests

```
cd services/collector && npx vitest run test/lucid                          # 17 files, 233 tests at last run
cd scripts/lucid && python3 -m unittest test_gather test_herald test_tail   # 74 tests
cd cli && npx vitest run test/lucid test/commands/lucid.test.js             # 57 tests; needs cli/node_modules
```

A fresh worktree has no installed `cli/node_modules`: run `quox-deps` in the worktree root (lockfile-matched
cache symlink; `quox-deps --unlink` before commit) rather than installing or symlinking another checkout. Run the whole LUCID set, not only the file you touched.

## Where status lives

QuoxPlan stream LUCID (#517): `quox plan` (the standalone `quoxplan` CLI needs a service key; use `quox plan` or the dashboard). Honest maturity:
`docs/STATUS_AND_LIMITS_LUCID.md`. Audit: `docs/LUCID_AUDIT_2026-10-11.md`. Design and owner decisions:
`~/LUCID_DESIGN_2026-10-09.md` (owner decisions at the top override the rest). Resume brief in memory:
`handover-lucid-2026-10-09`. Never complete the stream without the owner's word, and never track status in loose markdown.

## Also read

- `docs/LUCID_ADDING_A_SOURCE.md` to add anything to LUCID's peripheral vision.
- `docs/LUCID_DEVELOPER_GUIDE.md` for architecture, data model and tests.
- Quoxify dimension 21 (AWARE) before building any plugin, agent or capability.

## Feed this skill back

If you work out a better recipe or hit a stale command or gotcha in LUCID, fix THIS file in the same session
(canonical copy: `~/.claude/skills/quoxpert-lucid/SKILL.md`) or file it with `quox gripe`.

<!-- >>> tips (generated by sync-quoxpert-tips; do not edit) >>> -->
## Tips users see

Quox shows these one-line tips to users (`quox tips`). Know them so you can point at the right command.

- **The situation right now**: `/sitrep` (beta; shows when: lucid)
- **What happened while you were away**: `/away` (beta; shows when: lucid)
<!-- <<< tips <<< -->
