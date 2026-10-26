---
name: quoxpert-youtube
description: "Use the Quox YouTube plugin for governed YouTube publishing and
  reads. Covers the quox youtube CLI, the 14-tool connector (8 gated writes
  incl. upload, thumbnail, captions, comment reply/moderation, scheduling),
  the credential lifecycle that finally works (hourly access-token refresh
  with vault write-back and 401-retry; Google TESTING-mode apps get 7-day
  refresh tokens), the org media root for files, quota honesty (an upload
  costs ~1600 of the 10,000 daily units), and the /youtube dashboard. As of
  2026-10-24 the surface is test-proven but has never been driven against
  live Google APIs."
argument-hint: "<task, e.g. 'upload a video', 'why did my token die', 'read channel analytics', 'reply to a comment'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard
    stream: YT-OVERHAUL
    sources:
      - repo: quox-dashboard
        path: docs/STATUS_AND_LIMITS_YOUTUBE.md
      - repo: quox-dashboard
        path: services/collector/lib/connectors/types/youtube.js
      - repo: quox-dashboard
        path: src/services/youtubeClient.js
      - repo: quox-dashboard
        path: cli/lib/commands/youtube.js
---

# Quoxpert: YouTube plugin (governed publishing, working credentials)

The truth ledger is `quox-dashboard/docs/STATUS_AND_LIMITS_YOUTUBE.md`. History
that shapes everything: YouTube shipped marked COMPLETE and never worked once.
The UI called two routes that never existed, the wizard asked for four
credential fields while the vault stored two, and every pasted token died
within the hour because the "auto-refresh" was a short-circuit that never
fired. YT-OVERHAUL (#481, 2026-10-24 overnight) rebuilt all of it to the
X/LinkedIn standard.

## The credential story (the part that was rotten)

Vault type `youtube`, FIVE fields: `access_token`, `refresh_token`,
`client_id`, `client_secret` (all required) + `api_key` (optional, keyed
public reads). The refresh is real now:
- Proactive: refreshes when `expires_at` is absent or near; a freshly pasted
  token gets refreshed immediately to learn its true expiry.
- Persistent: the refreshed `access_token` + `expires_at` are WRITTEN BACK to
  the vault through the internal credential-fields endpoint (service-key
  gated, org-matched, audited), and the pooled connector serves the new token
  with no restart.
- Resilient: any YouTube 401 triggers one refresh-and-retry, then an honest
  error. `invalid_grant` from Google means the REFRESH token is dead and the
  error says so.
- The sharp caveat: a Google Cloud app in TESTING publishing status expires
  refresh tokens after 7 DAYS. Verified apps keep them indefinitely (with the
  ~6-month-inactivity rule). Never promise immortality; name the app status.

## The governance model (same shape as the other four)

- **8 writes gated at the bridge choke** with typed `youtube-plugin` approval
  cards: upload_video, update_video, set_thumbnail, add_to_playlist,
  reply_comment, moderate_comment, upload_captions, schedule_video. Pending
  is the correct outcome; a human approves from Inbox-Q. 6 reads are direct.
- **Files come from the org media root** `/var/lib/quox/youtube-media/<org>`
  (symlink-safe realpath containment; caps: video 256MB, thumbnail 2MB
  jpg/png, captions 1MB srt/vtt). Raw collector paths are refused; the
  approval card shows the media-root-relative name only.
- **Licence**: all 14 capabilities map to the `youtube` entitlement, and
  unlike facebook/instagram/tiktok, youtube IS in the governed catalog
  ($4 single tier), so the gate is real on licensed installs.
- **Analytics are mapped by column NAME**, honoring the caller's requested
  metrics (the old code read fixed row indices whatever you asked for).
  Valid defaults: views, estimatedMinutesWatched, averageViewDuration,
  likes, subscribersGained.

## CLI (wire-tested; live runs pending first credential)

```
quox youtube upload "title" --file <path-in-media-root> [--description t] [--privacy private|unlisted|public] [--thumbnail <image-path>]
quox youtube videos
quox youtube channel            # cheapest live credential check
quox youtube analytics [--metrics views,likes,...]
quox youtube comment <videoId> "text"    # gated reply
```
Writes print the inbox item id + the approve hint. `--thumbnail` files a
SECOND approval (set_thumbnail is its own gated tool against the uploaded
video).

## Gotchas

- **Quota, not dollars**: an upload costs ~1600 of the default 10,000 daily
  units. Six uploads a day and the quota is gone. The Health tab says so.
- The dashboard Health tab shows the access-token expiry countdown in
  MINUTES with auto-refresh noted; a hard token_rejected after refresh means
  the refresh token itself is dead: re-authorise in Vault.
- Comments need a SELECTED VIDEO id; the old UI fed the channel id into the
  comments API for months (never worked).
- The plugin ships as a STRIPPED signed bundle: any view change needs a
  bundle rebuild + re-sign or installed customers keep the old UI.

## What is NOT built (do not promise)

OAuth broker (paste the four fields from Google Cloud Console), browser file
upload, scheduling lanes beyond schedule_video's publishAt, Shorts specials,
multi-channel, the YT-3 agentic team ($45, queued behind this stream).
