---
name: quoxpert-instagram
description: "Use the Quox Instagram plugin for governed Instagram publishing
  and reads. Own plugin SKU on the shared Meta foundation: the SAME meta vault
  credential as the Facebook plugin reaches the IG professional account through
  its linked Facebook Page. Covers the container publish flow (create, poll,
  publish), the 100-posts/24h quota, the quox instagram CLI, bridge-level HITL
  on publish and comment replies, and the /instagram dashboard. As of
  2026-09-18 the surface is test-proven but has never been driven against a
  live Meta App."
argument-hint: "<task, e.g. 'publish a reel', 'check the quota', 'why is there no IG account', 'reply to a comment'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard
    stream: IG-PLUGIN
    sources:
      - repo: quox-dashboard
        path: docs/STATUS_AND_LIMITS_INSTAGRAM.md
      - repo: quox-dashboard
        path: services/collector/lib/connectors/types/instagram.js
      - repo: quox-dashboard
        path: services/collector/lib/connectors/metaGraph.js
      - repo: quox-dashboard
        path: src/services/instagramClient.js
      - repo: quox-dashboard
        path: cli/lib/commands/instagram.js
---

# Quoxpert: Instagram plugin (governed container publishing)

The truth ledger is `quox-dashboard/docs/STATUS_AND_LIMITS_INSTAGRAM.md`. Built
overnight 2026-09-18 as the fourth plugin over the X/LinkedIn governance ground,
sharing the Meta foundation with the Facebook plugin.

## The model

- **One credential, two plugins.** Vault type `meta` (a long-lived user/Page
  token) powers BOTH the facebook and instagram plugins. The IG professional
  account is reached THROUGH its linked Facebook Page (the Business route).
  There is no separate Instagram credential to paste; the setup wizard runs
  `discover_account` and saves the chosen `ig_user_id` to plugin config.
  "No IG account linked to the Page" is a distinct, honestly-classified health
  state with its own fix (link an IG professional account to the Page).
- **Publishing is a two-step container flow, gated at the bridge.**
  `instagram_publish_media` (requiresApproval) creates a media container
  (image/video/reel by public https URL — Graph pulls it server-side), polls
  `status_code` (FINISHED / IN_PROGRESS / ERROR / EXPIRED, ~20s budget), then
  calls `media_publish`. A container still processing past the budget throws an
  HONEST retryable error naming the container id — it never silently skips the
  publish (the LinkedIn image-AVAILABLE lesson applied to containers).
  `instagram_reply_comment` is the second gated write. Both return pending with
  the inbox item id; approval binds the exact input.
- **Seven reads execute directly**, including `get_publishing_limit`: Instagram
  enforces 100 API-published posts per rolling 24h (a carousel counts as one);
  the Health tab and `quox instagram quota` surface the real usage.
- **Graph API pinned v26.0** in the shared `metaGraph.js` (live-probed
  2026-09-18). Insight metric names churn hard on IG; invalid-metric errors
  surface Meta's message verbatim — check the metric list before blaming the
  token.

## CLI (wire-tested; live runs pending first credential)

```
quox instagram accounts                          # discover IG accounts via Page linkage
quox instagram publish "caption" --account <IG_USER_ID> --image https://... [--video URL] [--reel]
quox instagram media --account <IG_USER_ID>
quox instagram insights --account <IG_USER_ID> | --media <MEDIA_ID>
quox instagram comments --media <MEDIA_ID>
quox instagram reply <COMMENT_ID> "text"         # gated, files an approval
quox instagram quota --account <IG_USER_ID>
```

## Gotchas

- **Media must be at a PUBLIC https URL.** Graph fetches it server-side; a
  localhost or LAN URL can never work and private URLs are refused client-side.
- **Scopes** (on the shared meta token): `instagram_basic`,
  `instagram_content_publish`, `instagram_manage_comments`,
  `instagram_manage_insights`, plus the Facebook Page scopes. A token that
  works for the Facebook plugin but lacks the instagram_* scopes will read
  token_rejected here while Facebook stays green — that asymmetry is real, not
  a bug.
- **Rotating the meta credential re-stamps ONE 60-day expiry window for both
  plugins.** The countdown on both Health tabs is the same clock.
- **Licence honesty**: capabilities map to the `instagram` entitlement but the
  plugin is not yet in the governed catalog (same interim as facebook) — it
  resolves free on every install until the owner-gated quox.ai catalog update.

## What is NOT built (do not promise)

Carousels, Stories, DMs, Threads, scheduling, listening (QuoxSignal's),
Instagram ads (META-ADS), the Instagram-Login pageless route (future path for
IG-only customers; v1 is the Business route via Page linkage).
