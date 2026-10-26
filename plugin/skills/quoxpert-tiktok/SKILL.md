---
name: quoxpert-tiktok
description: "Use the Quox TikTok plugin for governed TikTok video publishing
  and reads. Covers the quox tiktok CLI, bridge-level HITL on publish and
  draft-upload, the org media root for video files, the 24-hour access token
  (no auto-refresh yet, daily rotate is the real contract), and the TWO hard
  external gates: unaudited TikTok apps post PRIVATE-ONLY (SELF_ONLY) until
  TikTok approves the app audit, and PULL_FROM_URL needs a verified domain so
  file upload is the route. As of 2026-09-18 the surface is test-proven but
  has never been driven against the live TikTok API."
argument-hint: "<task, e.g. 'publish a video', 'why is my post private', 'token died again', 'upload a draft'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard
    stream: TIKTOK-PLUGIN
    sources:
      - repo: quox-dashboard
        path: docs/STATUS_AND_LIMITS_TIKTOK.md
      - repo: quox-dashboard
        path: services/collector/lib/connectors/types/tiktok.js
      - repo: quox-dashboard
        path: src/services/tiktokClient.js
      - repo: quox-dashboard
        path: cli/lib/commands/tiktok.js
---

# Quoxpert: TikTok plugin (governed video publishing)

The truth ledger is `quox-dashboard/docs/STATUS_AND_LIMITS_TIKTOK.md`. Built
overnight 2026-09-18, fifth plugin on the X/LinkedIn governance platform.

## The two external gates (lead with these, always)

1. **Unaudited TikTok apps post PRIVATE-ONLY.** Until TikTok approves the app
   audit, every post is restricted to private viewing regardless of the
   requested privacy level. The connector passes the requested level through
   and surfaces TikTok's own response; it never silently downgrades. The audit
   is owner paperwork: free to start, weeks to clear. Dogfood proves the whole
   governed pipeline with SELF_ONLY posts and drafts meanwhile.
2. **Access tokens live 24 HOURS.** There is NO auto-refresh yet (the shared
   vault write-back machinery is a separate stream, YT-O-2; TikTok refresh
   tokens ROTATE on every refresh, so write-back is mandatory before any
   refresh claim). The real contract today: rotate the credential daily. The
   vault type stores refresh_token + client_key + client_secret NOW so
   credentials already hold what refresh needs when it lands. `expires_at`
   stamps the honest 24h; the Health tab counts down in HOURS (amber under 12,
   red under 4).

## The model

- Two gated writes at the bridge choke: `tiktok_publish_video` (direct post:
  init FILE_UPLOAD, chunked PUT of the bytes, publish_id returned) and
  `tiktok_upload_draft` (lands in the user's TikTok INBOX as a draft they
  finish in the TikTok app; the pre-audit workhorse). Both file typed approval
  cards (source 'tiktok-plugin', SELF_ONLY badge on the card); pending is the
  correct outcome until a human approves from Inbox-Q.
- Four reads execute directly: get_profile (also the cheapest live credential
  check), list_videos, get_video_stats, get_publish_status (follow up an
  approved publish honestly by publish_id).
- **Video files come from the org media root** (`/var/lib/quox/tiktok-media`,
  symlink-safe containment, 128MB cap) — never arbitrary URLs (TikTok's
  PULL_FROM_URL requires a domain VERIFIED with TikTok, so it is not built),
  never raw collector paths.

## Credentials (vault type `tiktok`)

Four required fields from the TikTok developer portal: `access_token`,
`refresh_token`, `client_key`, `client_secret`. testEndpoint is the real
user/info read. A 401 within a day of pasting is EXPECTED behaviour (24h
lifetime), not a plugin bug; the health check's token_rejected message says so.

## CLI (wire-tested; live runs pending first credential)

```
quox tiktok publish "title" --file <path-in-media-root> [--privacy SELF_ONLY|MUTUAL_FOLLOW_FRIENDS|PUBLIC_TO_EVERYONE] [--no-duet] [--no-comment] [--no-stitch]
quox tiktok draft "title" --file <path>     # inbox draft, finish in the app
quox tiktok profile                          # cheapest live credential check
quox tiktok videos
quox tiktok stats --ids <id,id>
quox tiktok status --publish-id <id>
```
Writes print the inbox item id + `quox inbox respond <id> --action approve`;
publish prints the audit note whenever privacy is not SELF_ONLY.

## Gotchas

- Draft/inbox init path and bulk stats (video/query) are knowledge-based
  contracts flagged in code comments; the first live drive must confirm them
  (no live TikTok call has ever been made from this install).
- Higgsfield's MCP gives the OWNER personal TikTok publishing already; this
  plugin's reason to exist is org-scoped, vault-held, HITL-gated publishing
  with the approval trail as the ledger. Do not pitch it as raw capability.
- Licence honesty: capabilities map to the `tiktok` entitlement but the plugin
  is not yet in the governed catalog (same interim as facebook/instagram);
  it resolves free on every install until the owner-gated catalog update.
- Listening/scraping stays QuoxSignal's; TikTok Ads would be a sibling of
  META-ADS if ever wanted.

## What is NOT built (do not promise)

Auto-refresh (YT-O-2), public posting before the app audit clears, comments,
music tools, scheduling, browser file upload, PULL_FROM_URL, TikTok Shop/Ads.
