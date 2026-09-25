---
name: quoxpert-discord
description: "Operate Quox Discord Pro from a Claude: the daemon that bridges a Discord server to QuoxCORE (server management, feeds, grounded support, agentic team). The quox discord CLI, binding modes, checking gaps and health, the dashboard panel. Load when running or debugging Discord Pro."
argument-hint: "[status | bindings | bind | modes | gaps | troubleshoot]"
license: LicenseRef-SkillRights-Reserved-1.0
---

# quoxpert-discord — operate Quox Discord Pro

Discord Pro is a **backend-shaped plugin**: its own repo (`quox-discord-pro`), its
own loopback-bound container, plus a dashboard panel under
`quox-dashboard/src/components/discord-pro`. One daemon per QuoxCORE instance,
a separate Discord application per instance (dev and prod never share
credentials). It bridges one Discord server to one collector.

## The CLI (canonical: `quox discord`)

Nothing ships without `quox` CLI support. `quox discord <verb>` is a thin
wrapper over the daemon's control CLI (`qdp`); one control surface, one client,
no drift. Runs host-local (where the daemon runs). Verbs:

```
quox discord status                 daemon liveness, instances, binding count
quox discord health                 one-line OK/actionable (exit 0 ok, 1 not)
quox discord instances              configured instances + their collectors
quox discord bindings               every channel binding (channel, mode, instance, persona)
quox discord bind <ch> <mode> [k=v] bind a channel to a mode (live, persisted, no restart)
quox discord unbind <ch>            remove a binding
quox discord gaps                   open support gaps awaiting an official answer
```

## Binding modes

| Mode | What the channel does |
|------|-----------------------|
| `echo` | dev smoke test: the bot echoes, proves the gateway + dedup |
| `support` | governed support replies, HITL policy per channel, drafts to the dashboard inbox |
| `quoxchat` | grounded support answered by a QuoxChat widget (the production support brain) |
| `team` | one bound agent answers as its own persona (tools enabled via the /chat path) |
| `roundtable` | CommanderQ convenes 2-3 specialists, each answers as itself with tools, then synthesises |
| `feed` | webhook persona posts a feed (build queue, GitHub) |

Example: `quox discord bind <channel_id> roundtable agent=quox` then post in that
channel; specialists execute their real tools (proven: ATLAS ran fleet_status +
proxmox_cluster_status and returned the live host list).

## Health, gaps, dashboard

- `quox discord health` for a fast OK/actionable line (use in checks).
- `quox discord gaps` lists questions QuoxSupport could not answer well; a human
  answers one from the dashboard inbox and the sweeper folds it into the corpus.
- Dashboard panel at `/discord-pro` shows live daemon status + bindings (reads
  the collector `/api/discord-pro/status`, which reaches the daemon control API).

## Troubleshooting

- **Support answers are ungrounded / generic** → the widget's embedding is
  failing. Check the widget's embed provider vs its BYOK key (2026-08-08: the
  provider defaulted to gemini while the widget was OpenAI-BYOK, so RAG was
  dead). `knowledge/search` returning `embedding_failed` is the tell.
- **Team gives textbook advice instead of doing things** → the agent was
  invoked with `no_tools`. Roundtable specialists use the tools-enabled path;
  the orchestrator stays no-tools (128-tool cap).
- **Bot went deaf in a private channel** → it needs an explicit role allow
  there (removing Administrator stops it bypassing channel overwrites).
- **Pinning fails 403 with MANAGE_MESSAGES present** → Discord split pinning
  into its own PIN_MESSAGES permission (bit 51), and a bot cannot self-grant
  a permission it does not hold: a human must tick PIN_MESSAGES on the bot's
  role. Per-slot channel status cards (slotChannels.js) survive this by
  living unpinned in recent history and re-attempting the pin each pass.
- **Never rename a channel per event.** The channel PATCH (name/topic) bucket
  is NOT documented by Discord (checked docs.discord.com 2026-08-20; response
  headers are the only truth) and the observed bucket is tight enough that
  rename-per-checkout degrades silently under churn. Names stay stable
  (per-slot channels take the SLOT name); live state goes in an edited
  status-card message, topic updates are best-effort only.
- Honest maturity + limits: `quox-dashboard/docs/STATUS_AND_LIMITS_DISCORD_PRO.md`.

## Related
- Stream: QuoxPlan `QDIS-PRO`. Concierge (cross-platform conversational
  front-of-house agent) is planned, QuoxPlan note #2449 + memory
  `idea_concierge_product`.
- `quoxpert-cli` for the rest of the `quox` CLI, `quoxpert-plugin-sdk` for the
  plugin shapes.
