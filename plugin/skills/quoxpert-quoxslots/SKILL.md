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

## Gotchas (each cost a real debugging pass on 2026-08-17)

- **An active org is required.** With no org in the CLI profile and no `--org`,
  slot verbs refuse. Without this the collector silently scoped rows to org
  'default' on the first live drive.
- **--session must match the holder.** heartbeat/release/say default to
  $QUOX_STREAM; if you checked out under a different name you get a correct 409,
  not a bug.
- **KNOWN BUG (quoxai/quox#536, found 2026-09-12): say can 403 even when
  --session matches the holder.** Checkout trusts the body holder_session, but
  the say route compares the AUTHENTICATED identity (e.g. resident:dev-01)
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
