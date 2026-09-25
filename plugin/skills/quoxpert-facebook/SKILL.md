---
name: quoxpert-facebook
description: "Use the Quox Facebook plugin for governed Facebook Page publishing
  and reads (organic only; ads live in META-ADS). Covers the quox facebook CLI,
  the Facebook agent, the shared meta vault credential (pasted long-lived token,
  60-day tracked expiry), bridge-level HITL on publishing, page-token resolution,
  lead form reads, and the /facebook dashboard. Load for Facebook Page posting,
  insights, leads, credentials or the Facebook panels. As of 2026-09-18 the
  surface is test-proven but has never been driven against a live Meta App."
argument-hint: "<task, e.g. 'post to the page', 'read lead forms', 'set up the Meta token', 'why is publish pending'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard
    stream: FB-PLUGIN
    sources:
      - repo: quox-dashboard
        path: docs/STATUS_AND_LIMITS_FACEBOOK.md
      - repo: quox-dashboard
        path: cli/lib/commands/facebook.js
      - repo: quox-dashboard
        path: services/collector/lib/connectors/types/facebook.js
      - repo: quox-dashboard
        path: services/collector/lib/connectors/metaGraph.js
      - repo: quox-dashboard
        path: src/services/facebookClient.js
      - repo: quox-dashboard
        path: src/pages/views/FacebookView.jsx
---

# Quoxpert: Facebook plugin (governed organic Pages)

The truth ledger is `quox-dashboard/docs/STATUS_AND_LIMITS_FACEBOOK.md` — read it
before promising anyone anything. Built overnight 2026-09-18 to the X/LinkedIn
standard from the first commit (no overhaul debt): guard tests pin every route the
client calls, so a dead-UI-on-phantom-routes repeat is structurally impossible.

## The boundary (decided 2026-09-18, owner veto-able)

This plugin owns ORGANIC only: Pages read, Page insights, lead forms/leads,
governed Page publishing. Everything ads (`act_<id>` insights, spend, boosts)
belongs to META-ADS (#457) and the `facebook_ads` vault type. If someone asks
this plugin for ad spend, the answer is "wrong plugin", not a workaround.

## The model (same governance shape as X and LinkedIn)

- **Connector registry id is `facebook_pages`** (the id `facebook` collides with
  the `facebook_ads` spec namespace), so tool names are `facebook_pages_<tool>`.
  The PLUGIN/entitlement id is `facebook`. Do not mix these up when grepping.
- **The one write, `publish_page_post`, is gated at the bridge choke** with
  `requiresApproval: true` and a typed approval card (source `facebook-plugin`).
  Every path crosses the choke: agent chat, Compose panel, generic connector
  route, CLI. A write returns `{ pending: true, status: 'awaiting_approval',
  approvalId, inbox_item_id }` — that is the CORRECT outcome; the post exists
  only as an Inbox-Q card until a human approves. Non-approve actions never
  execute (fail-closed platform-wide).
- **Six reads execute directly**: get_pages, get_page_info, get_page_posts,
  get_page_insights, get_lead_forms, get_leads. No per-call dollar cost.
- **Page tokens are resolved server-side** (`resolvePageCredentials`): the
  connector fetches the Page token from the vaulted user token when needed and
  NEVER emits it in tool output. The parked prototype accepted a
  `page_access_token` from tool input — that hole was deliberately not rebuilt;
  do not "restore" it.
- **Licence**: capabilities map to the `facebook` entitlement in
  CAPABILITY_REQUIRES_PLUGIN, but the plugin is currently NOT in the governed
  catalog (the quox.ai signed catalog has no facebook entry yet), so it resolves
  FREE on every install. Selling it requires the owner-gated catalog + signed
  catalog regen upstream. State this honestly; do not call it "licence enforced".

## Credentials (shared `meta` vault type, NOT OAuth)

Type `meta`, field `access_token` (+ optional `page_id` default). Paste a
LONG-LIVED user token or a Page token from Meta's Graph API Explorer / token
debugger. Long-lived Meta tokens live ~60 days: `tokenLifetimeDays: 60` stamps
`expires_at` at save/rotate, the health scanner warns org admins at <=7 days,
and the Health tab shows the countdown (amber <=14d, red <=7d). The same `meta`
credential also powers the Instagram plugin through the Page linkage — one
paste, two plugins. Scopes for full function: `pages_show_list`,
`pages_read_engagement`, `pages_manage_posts`, `read_insights`,
`leads_retrieval`. A development-mode Meta App fully serves its own admins on
their own Pages; app review only gates external customers.

## CLI (wire-tested; live runs pending first credential)

```
quox facebook post "text" --page <PAGE_ID> [--link URL] [--image URL]
quox facebook pages                     # also the cheapest live credential check
quox facebook posts --page <PAGE_ID>
quox facebook insights --page <PAGE_ID>
quox facebook lead-forms --page <PAGE_ID>
quox facebook leads --form <FORM_ID>
```
Writes print the inbox item id and the `quox inbox respond <id> --action approve`
line. `--image` publishes via `/photos` with a caption (Graph pulls the https
URL server-side; there is no local image fetch, so no SSRF surface here).

## Gotchas

- **Graph API is pinned v26.0** (live-probed 2026-09-18: v26.0 newest valid,
  v27.0 rejects) in `connectors/metaGraph.js`, shared with Instagram. When it
  goes stale, re-verify contracts before bumping (the LinkedIn 202401 lesson).
- **Page Insights metric names churn.** Defaults are
  `page_impressions,page_post_engagements,page_fans`; if Meta deprecates one the
  connector surfaces Meta's own error verbatim. Check the metric list before
  blaming the token.
- **A dead token must never read as Connected**: get_page_info throws on
  failure so health classifies token_rejected. Do not swallow provider errors.

## What is NOT built (do not promise)

Ads anything (META-ADS), comment writes, scheduling lanes, groups (ToS ruling),
browser file upload, OAuth broker, Instagram (its own plugin), store/catalog
listing on quox.ai (promo pages exist on a branch, unmerged).
