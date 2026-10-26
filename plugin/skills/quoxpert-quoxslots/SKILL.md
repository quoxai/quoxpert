---
name: quoxpert-quoxslots
description: "Make any Claude fluent at QuoxSlots, the Dev Suite's durable session
  addresses (DEVSUITE-SLOTS). A fixed, org-scoped pool of named slots that
  ephemeral agent sessions check out and release; each slot is a derived Matrix
  room, so you talk to the slot, not to whichever session holds it. Load when a
  session should claim a durable address, post or read slot messages, steer a
  slot-holding session, or read the slots deck. NOT for ad hoc session-to-session
  mail on one box (session-relay owns that) or for chat rooms generally (M-ROOMS)."
argument-hint: "<task, e.g. 'checkout the builder slot', 'read steer for this slot', 'who holds which slot'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard
    stream: DEVSUITE-SLOTS
license: LicenseRef-SkillRights-Reserved-1.0
---

# QuoxSlots

**The address outlives the session: checkout, say, release; the room and its history stay.**

## What it is

A collector-owned registry of named slots (org_id on every row) plus one derived
Matrix room per slot (M-ROOMS provision path, node_type `dev_slot`, default_agent
quox, ledger = matrix_rooms in auth). Sessions never hold Matrix credentials;
every verb is a governed collector route and checkout/release/say are
WARD-witnessed as `quox.slot.*` envelopes. Full maturity map:
`quox-dashboard/docs/STATUS_AND_LIMITS_QUOXSLOTS.md`.

## Cross-slot conversations: answer in the ASKER'S listening channel

Each session's `slot wait` hears only its OWN slot. When another slot-holder
posts a question INTO your room and you reply in your room, they never hear
it: both sides stall, each waiting on the other (live incident 2026-10-05,
SEER-TERMINAL x calendar-q, 30+ min until the owner noticed the deadlock).
Until the product grows cross-post/notify (gripe filed 2026-10-05), reply via
`quox slot say <their-slot> ...` AND/OR session-mail to their inbox, and say
in the message which channel you used.

## Session lifecycle (the recipe that matters)

At session start, right after /rename and identity export:

```
quox slot checkout <name> --session <SESSION-NAME> --kind interactive --host $(hostname)
```

Immediately after checkout, arm the watcher in the background:

```
quox slot wait <name> --session <SESSION-NAME>     # backgrounded
```

`wait` (shipped 2026-08-22) long-polls the collector and EXITS the moment
anyone else speaks into the slot, printing the messages, so whatever spawned
it wakes and can reply. It also heartbeats your hold on every round-trip, so
one background command replaces the separate heartbeat loop AND any
hand-rolled poll script. Re-arm it after each wake (pass the printed resume
cursor as `--since` to avoid re-reading). Why this is not optional: read-back
is pull, and on 2026-08-22 a resident held its slot with a steady heartbeat
while the owner's Discord replies sat unread, until the owner asked why he
was being ignored. A held slot with no armed wait is a deaf resident.

During work: `quox slot say <name> "<milestone>" --session <SESSION-NAME>` posts
into the slot room (witnessed); `quox slot read <name>` (or `peek`) pulls recent
messages including owner steer; `quox slot heartbeat <name> --session <SESSION-NAME>`
keeps the hold fresh (15m TTL to stale, then auto-free; a crashed session never
wedges a slot), though an armed `wait` already covers this.
On exit: `quox slot release <name> --session <SESSION-NAME>`.

## Hold keeper and session-bound identity (SLOTS-PERFECT, 2026-10-03)

Holds no longer depend on the model remembering to re-arm `wait`:
- `quox slot checkout` under a Claude session records `{session, sessionKey
  (claude-<pid>), pid, starttime}` in `~/.quox/held-slots.json` and spawns a
  detached **hold keeper** (`quox slot keep`, log `~/.quox/keepers/<slot>.log`):
  heartbeat every 5m, backoff on outage, retires after ~2h of failures, exits
  on HOLD LOST / 404, and **releases the slot when the Claude session exits**.
  `release` stops it at once. Opt out with `--no-keep`.
- heartbeat/release/say/read/wait resolve the session from that entry when run
  from the same Claude session, so `--session` is optional after checkout and
  name case can no longer mismatch (quox#662). Dead or pid-reused entries are
  pruned on any slot verb.
- A holder's heartbeat now **revives its own stale slot** (collector), and the
  sweep has a boot grace: a collector restart/outage no longer marks every hold
  stale. Checkout still only takes `free` slots for anyone else.
- `wait` exits **3** with `HOLD LOST: ... re-run quox slot checkout ...` when the
  hold is gone, instead of polling deaf forever.
- You still arm `wait` to HEAR replies; the keeper only keeps the hold.
- Statusline (dev pack): `Ⓠ ⬢ slot <name> · ◉ agent <id>`, or `⬡ not attached`
  / `○ no agent`; it flashes on claim/release/attach/detach.
- Long says split into numbered `(n/N)` Discord posts instead of being cut at
  1900 chars (quox#485 part 2). Attachments are not built yet (#485 part 1).
- Slot API responses carry `discord_webhook_set`, never the webhook URL
  (quox#665): the URL is a posting credential and stays server-side.
- Headless responder: `quox-resident-supervisor.service` (user unit) answers the
  `quoxperticus-126` slot with no session open. It died 2026-10-01 when an auth
  outage tripped StartLimitBurst; `systemctl --user status` it when a slot with
  no session goes silent. Fix: login retries inside one start
  (zz-outage-tolerance.conf drop-in).

## The verbs

```
quox slot list                        # deck: NAME STATE HOLDER HOST AGE HEARTBEAT
quox slot create <name> | retire <name>   # admin, rare; name = [a-z0-9-]{1,32}
quox slot checkout <name> [--session s] [--kind interactive|loop] [--host h] [--force] [--create]
                                      # --create: make the slot if missing, then hold it, in ONE atomic op
                                      #   (race-safe: concurrent --create of the same name -> one winner).
                                      #   Skips the "create then checkout" two-step; no admin create needed.
quox slot release|heartbeat <name> [--session s] [--force]
quox slot say <name> <text...> [--session s]
quox slot read <name> [--since ts] [--limit n] | peek <name>
quox slot wait <name> [--session s] [--since ts] [--timeout mins] [--once]
                                      # block until someone speaks (see above)
```

Since 2026-08-20 every slot also gets its OWN Discord channel (named after
the slot, created on slot create, healed on checkout, KEPT on retire with a
"disconnected" line). `say` posts into it via the slot's per-channel
webhook, and a human typing in the channel flows BACK into `read` (source
`discord`) through the daemon's slot binding, so replying in-channel
reaches the holding session as soon as it polls. The channel is never
renamed; live state is the (best-effort pinned) status card, rewritten on
checkout/release/stale/retire.

## Is the human there? (PRESENCE, 2026-10-16)

The owner marks himself away with `/afk [note]` or `/sleep` in quox (or `quox presence set away|sleeping|present --note "..."`).
It is server-side, per user and org. When he is away:
- `quox slot say|broadcast|page` into `hitl`, `triage-q` or his own window's slot prints `⏸ owner away since 15:54 UTC (note): approvals will queue` (JSON: `human_presence`).
- `quox slot list` prints the same under the table; `quox presence [who]` reads it; agents have `presence_get`; chat turns carry `[OWNER PRESENCE]`.
- `quox ask` and `create_inbox_item` still file the item and return `owner_away: true` + `owner_away_since`.
What to do: do NOT block on `quox ask --wait`. File the approval, then work on something else or another avenue.
Nothing is ever auto-approved. `/back` or any typed message in his window marks him present.

## Write for a phone screen (owner, 2026-10-05)

The owner reads slots in Discord, often on a phone. Messages arrived as "enormous
single paragraphs" because sessions pass everything as one quoted shell string.
Newlines and Markdown survive the whole pipeline, so format the message:

```
quox slot say <name> - --session <S> <<'EOF'
**Fixed: the trace card clipping (#649)**

- Cause: the chat column squeezed the live card
- Fix: deployed, checked in Chrome and Safari
- Needs you: nothing
EOF
```

Rules: one bold first line saying the outcome; then short bullets; blank line between
groups; no wall of text; keep it under ~10 lines (link or say "details in terminal"
for more). A quick acknowledgement can stay one line.

## Gotchas (each cost a real debugging pass on 2026-08-17)

- **To post to `hitl` (the owner's single channel), JOIN it, never check it out** (2026-10-19). `quox slot join hitl` then `quox slot say hitl "..."` posts without holding. A session that checks out `hitl` just to post a correction ends up holding the owner's address for hours, and releasing it later is an owner-level action (auto mode denied it). Also, the hitl slot has no Discord channel of its own (`list` shows `matrix`). Its says reach Discord through a bridge webhook, and heal-on-checkout did not create a channel, silently (quox#1322).

- **A slot without an armed `wait` is deaf, and then it is lost (2026-10-02,
  owner gripe "dev slots are created for sessions but nothing ever replies").**
  Traced in the registry: session ASSISTANTQ checked out `assistantq` at 17:31,
  the owner's Discord message landed in the slot at 17:43 (`source=discord`,
  stored, so inbound delivery WORKS), the session never ran `wait`, so it never
  heard it and never heartbeated; the 15m TTL freed the hold at 18:17, and its
  later `say` 403'd "held by nobody" (quox#661). The `slot-inbox.sh`
  UserPromptSubmit hook only fires when someone types in the TERMINAL, so it
  cannot rescue a session idling for a Discord reply. In Claude Code the push
  path is: `quox slot wait <name> --session <s>` as a Bash call with
  `run_in_background: true`; its exit re-invokes the session with the messages.
  On EVERY wake, in this order: acknowledge at once (`say "seen, on it"`),
  re-arm `wait` in the background (printed cursor as `--since`), THEN do the
  work and `say` the real answer. READ THE WHOLE BATCH: the wake table can hold
  several messages and its TEXT column is truncated, so on every wake run
  `quox slot read <name> --since <previous cursor> --json` and handle EVERY
  message in it, owner broadcasts and Discord lines first. Never read just the
  newest one (`--limit 1/2`). On 2026-10-16 SITE-CLI read only the newest
  message per wake and missed hours of traffic, including the owner benching
  a worker (it then gave that worker a new job) and seven direct owner
  questions from Discord. 2026-10-03: seer was woken correctly by the
  owner's "Have you done your dailies?", then researched it for 28 minutes
  with no acknowledgement and no re-armed wait; from Discord it looked deaf
  and the hold went stale. `wait` now prints these steps on every wake.
  Also fixed 2026-10-03: a `wait` with no `--since` used to start at NOW and
  skip anything sent before it was armed; it now starts from the slot's last
  read (24h cap).
  Fixed 2026-10-16 (a82767122 + ddc5ba969): the resume cursor is
  `<created_at>|<seq>` (e.g. `2026-10-16T18:34:16.273Z|3518`), not a bare
  timestamp. A bare timestamp skipped a second message in the same
  millisecond, and the read mark (unread_count) used to stamp "now", so a
  message landing between the fetch and the stamp counted as read unseen.
  Pass the printed cursor back VERBATIM (quote it, it has a `|`); a plain ISO
  `--since` still works and means "after this time".
  Checkout now prints this as REQUIRED, and the session-start offer hook tells
  the session to arm it on a yes.
- **`say` straight after `checkout --create` used to 409 "slot has no Matrix
  room yet"**: room provisioning lands ~5s after checkout returns. The CLI now
  retries that one 409 for up to ~15s (2026-10-02). Note the collector puts
  the error text in the body's `error` field, which the CLI client stores as
  `err.code`, NOT `err.message`: match all of them, and build test fixtures
  the way `lib/core/client.js` does (the first cut matched `.message`, passed
  its unit test, and failed live).
- **The session-start offer went silent for every session (fixed
  2026-10-02).** A stale `export QUOX_STREAM=QUOX-SECURITY` in `~/.bashrc`
  made every session suggest the same slot name, and a stale
  `~/.quox/held-slots.json` entry for that name made the hook exit before
  printing EITHER offer (slot or agent). The hook now ignores held-slots on a
  fresh startup/clear (only resume/compact can already hold a slot) and never
  suppresses the agent offer. `held-slots.json` accumulates entries from
  sessions that exit without `release`; it is a hint, never a reason to stay
  silent.

- **An active org is required.** With no org in the CLI profile and no `--org`,
  slot verbs refuse. Without this the collector silently scoped rows to org
  'default' on the first live drive.
- **--session must match the holder.** heartbeat/release/say default to
  $QUOX_STREAM; if you checked out under a different name you get a correct 409,
  not a bug.
- **KNOWN BUG (quoxai/quox#536, found 2026-09-12): say can 403 even when
  --session matches the holder.** Checkout trusts the body holder_session, but
  the say route compares the AUTHENTICATED identity (e.g. resident:<dev-box>)
  and ignores --session, so a session that legitimately holds a slot cannot
  post into it. Until fixed: do not burn time re-trying flag orders; report
  milestones via the Telegram bridge instead and note the slot gap. The CLI
  also renders the error Detail as '[object Object]', hiding the mismatch.
- **read returns the collector cache**, not the raw room timeline. say/inbound
  write both; a message posted straight into the Matrix room by other means is
  not visible to read yet (v1 limit, see STATUS doc).
- **Owner steer from the phone:** a message starting `[<slot-name>] ...` in the
  owner's bridged room is delivered to that slot's seam by the appservice
  slotSteer hook (allowlisted senders only, org-less unique-name match). Check
  it with `quox slot read <name>` at every checkpoint.
- **Slot names should be globally unique across orgs** if bridge steer matters:
  ambiguous names are refused rather than guessed.
- **You cannot `say` into a RESIDENT slot you do not hold, by design (verified
  2026-09-26).** Resident slots enforce hold-is-the-voice server-side: `say`
  returns `403 not slot holder` for any non-holder, and the org-switch hint the
  CLI prints is a red herring. To reach a resident from another session, use
  the owner-steer bridge path above, or session-mail on the resident's own box
  (`ssh <host> '~/bin/session-mail post <inbox> --from <name> --subject "..."
  --body "..."'`; note the verb is `post`, and `--from`/`--subject` are
  required). Do not retry `say` under a different profile to get around it;
  the gate is the product working.

## Shared slot across splinters (QuoxIdentity P10, core driven live 2026-10-05)

When an agent is bound to a slot (`quox -p moo agent bind-slot <agent> <slot>`, org admin), every session that attaches that agent shares it:
the first attach holds the slot, later attaches print `Joined slot <slot> as member S2`.
Resident holders get a per-splinter label `resident:<host>@<lease8>` (`#` is rejected by the from-label charset).
Slot verbs from an attached session send the ATTACH token automatically.
`quox slot claim <slot> <msgId>` is a CAS: the loser gets `Already claimed by S2`.
A member's detach removes only that member; the holder's hold survives.
Check `quox aee query --intent quox.slot.member_join` and `--intent quox.slot.claim`; both carry `splinter`.
Also driven live: @S1/@S2 addressing (wait shows [@S2] and tells a member to CLAIM first), each member's wait wakes on the other's message, and the holder exiting promotes the member. Gotcha: a wait double-forked with `( cmd & )` loses its Claude ancestor, so it resolves the wrong session and prints a false HOLD LOST. Use run_in_background or a plain `&`.

## Surfaces

Deck UI: /dev-suite (Dev servers tab, Slots section, read-only by design). CLI is
the write surface.

**MCP boundary (deliberate, 2026-09-05):** the MCP/agent-tool surface exposes
`slot_list`, `slot_say`, `slot_read`, `slot_assign` only. `slot checkout` is
**CLI-only by design**: a checkout creates a holder that must persist and
heartbeat, which a stateless MCP tool-call cannot own (it would claim a slot then
orphan it). MCP agents earmark with `slot_assign` and participate with
say/read/list; a real session claims via the CLI. Rooms render in Matrix, and every say also renders a
[name]-prefixed line into the owner's Telegram group (set-relay, live since
2026-08-17). New slots need a one-time puppet invite into the bridge room:
`bash quox-dashboard/scripts/slot-bridge-invite.sh <slot-id>`.

## Enabling Discord for slots (operator setup)

Slot rooms bridge to Discord the same way they bridge to Telegram: each slot is
a Matrix room, and a mautrix-discord portal mirrors a Discord channel to a
Matrix room the collector renders slot lines into. Status honesty: as of
2026-08-17 the bridge is live and the bot is logged in; the room mapping is
a governed org setting via `quox slot bridge set` (phase 9 shipped), replacing the governed-setting
follow-up (DEVSUITE-SLOTS phase 9 — bridge rooms become org platform settings
and a `quox slot bridge` verb provisions the channel via the collector, so this
whole recipe collapses into one governed command).

One-time setup today:
1. Create a dedicated Discord bot application (Discord dev portal), enable
   Message Content + Server Members intents, invite it with View Channels /
   Send Messages / Read Message History / Manage Webhooks. Token handling: put
   it in a file, never paste it into a transcript; pipe it into the login.
2. The mautrix-discord bridge + its registration/DB are deployed in
   quox-matrix (compose service `mautrix-discord`, synapse
   `discord-registration.yaml`). Do NOT run the full `setup.sh` (it re-patches
   the Telegram relay config); run only the discord stanza. Restart synapse with
   `docker compose restart synapse` (plain `docker restart` is gated), verify
   the Telegram bridge stays up.
3. Log the bot in: DM `@discordbot:quox` `login-token bot <token>` from an admin
   Matrix account, read the "Successfully logged in" reply.
4. Bridge the slots channel (recommend a dedicated `#quox-slots`, or `#dev-suite`
   as the Dev Suite home). Bridging a channel is a live-Discord change and is
   deliberately gated from ad-hoc automation; do it via the bot's `guilds`
   commands as the operator, or the governed `quox slot bridge` verb once phase 9
   ships.
5. Set the bridged channel's Matrix portal room as the org's Discord bridge
   room -- GOVERNED, no env var, no rebuild: `quox slot bridge set discord
   <portal-room-id>` (admin; witnessed as `quox.slot.bridge_set`; `quox slot
   bridge list` shows it). Invite the slot puppet (scripts/slot-bridge-invite.sh).
   A slot `say` now renders into the Discord channel; a `[slot] ...` reply there
   steers the slot (add the sender to `SLOT_STEER_SENDERS`). The env vars
   `QUOX_SLOT_BRIDGE_ROOM`/`QUOX_SLOT_DISCORD_ROOM` remain only as a fallback.

## Gotcha: wake must be verified, and old keepers do not self-reload (WAKE-REAL, 2026-10-17)
- Claude Code can swallow an Enter that arrives in the same read as typed text (a loaded session reads both as one paste): the wake line then sits UNSENT in the box. Since 0a834fd7d the keeper lets the line land, presses Enter, verifies it left the box, and retries Enter only while the box holds exactly its own line. Results now say `woke ... a turn started` or `queued in %N ... mid-turn`.
- Wake is human-only: run it as the human profile (`quox -p moo slot control <slot> wake --wait`); a resident/agent profile gets 403.
- Only keepers that write `~/.quox/keepers/<slot>.build` self-reload (re-exec on a new CLI build). Keepers started before KEEPER-REEXEC (no .build file) keep the OLD code in memory until the slot's keeper is restarted; check `ls ~/.quox/keepers/*.build`.
