---
name: quoxpert-x
description: "Use Quox X Publisher for governed X (Twitter) posting and reads.
  Covers the verified quox x CLI, HERALD, vault credentials, human approval,
  org budgets, browser image upload, mentions polling and the two scheduling
  lanes. Agent posts always require HITL; pre-authorised publishing is for
  human approvers in dashboard Compose only. Load for X posting, reading,
  credentials, the /x dashboard or X budgets. The CLI read parity gap remains
  open; live proof and undriven capabilities are distinguished explicitly."
argument-hint: "<task, e.g. 'post an announcement', 'publish a thread', 'set up X credentials', 'check budget'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard
    stream: X-PLUGIN
    sources:
      - repo: quox-dashboard
        path: docs/STATUS_AND_LIMITS_X.md
      - repo: quox-dashboard
        path: cli/lib/commands/x.js
      - repo: quox-dashboard
        path: services/collector/lib/xTools.js
      - repo: quox-dashboard
        path: services/collector/routes/xRoutes.js
      - repo: quox-dashboard
        path: services/collector/lib/xPostingStore.js
      - repo: quox-dashboard
        path: services/collector/lib/connectors/types/twitter.js
      - repo: quox-dashboard
        path: src/pages/views/XView.jsx
      - repo: quox-website
        path: docs/latest/plugins/x.md
        revision: fe06dfc5
      - repo: quox-website
        path: api/scripts/seed-x-store-row.js
        revision: fe06dfc5
    generated_at: 2026-09-12
license: LicenseRef-SkillRights-Reserved-1.0
---

# Quoxpert: X (governed posting)

**Draft anywhere. Human approval authorises every publish.**

The dashboard header is **Quox X Publisher**; the store product is
**X.COM Publisher**, **$10 one-time**, an owner-set price recorded in
quox#537. The plugin id and route remain `x` and `/x`. X API usage is a
separate cost on the connected X account. Do not treat stale $2 labels in
the dashboard paywall or comparison copy as the current price.

An agent, workflow or CLI files a HITL approval card. A human owner or admin
approves before an OAuth 1.0a signed publish, with AEE decision evidence.
Dashboard Compose also lets a human approve now and schedule the publish for
later, without another tap at fire time. **Agent posts always retain HITL.**
The native write tools enforce the gate in code. The connector bridge exposes
no write tools because it has no approval gate; do not add writes there.

The agent persona is **HERALD**, the Herald social suite voice, with X as its
first channel. Its identifier remains `xtwitter`. HERALD drafts and files for
approval; never claim it published unless the ledger proves that outcome.

***

## CLI recipes

```bash
quox x post "text"       # draft a post for human approval
quox x thread <file.md>  # draft one approval card for a thread
quox x delete <tweet_id> # request a governed delete
quox x status            # budget usage and a live credential check
quox x media-root        # print the shared base media directory
quox x help post         # exact reply and image option syntax
quox x help thread       # exact image directive syntax
```

Verified against `cli/lib/commands/x.js` 2026-09-12; EXPANDED 2026-09-16
with the parity verbs: `quox x read <tweet_id>`, `quox x timeline [--count]
[--user]`, `quox x search <query> [--count]`, `quox x mentions [--since]`
(each makes exactly ONE paid read, roughly $0.005, stated in its help), and
`quox x like <tweet_id>` / `quox x repost <tweet_id>` (HITL cards like every
write, capped by the daily engagement budget). Writes call x_post, x_thread,
x_delete, x_like, x_repost through `POST /api/v1/tools/execute`. There is
still **no CLI scheduled-publish verb**, BY DESIGN: that lane is
requireHumanAdmin dashboard-Compose only. Live CLI runs are currently
blocked by the durable-profile agent-claim defect in the automation caveat
below; the tools behind the verbs are live-proven via the service-caller
path. `quox tool` manages the catalogue; it cannot execute a read tool.

Thread files contain blank-line-separated blocks, one block per post, each
at most 280 characters. The thread image directive and post options are
documented by the exact help commands above; they are omitted here to keep
this skill free of exclamation marks and double-hyphen flags.

**Media containment:** CLI image paths refer to files on the collector's
filesystem; the CLI does not upload or copy them. Files must resolve inside
`/var/lib/quox/x-media/<org_id>/`, with attachment symlink escapes refused.
`quox x media-root` prints only `/var/lib/quox/x-media`, a CLI default, without
looking up the org or a server override. Append the actual org id.

Compose now uploads browser images and selects them from its media library.
`POST /x/media` validates image content and stores an org-relative filename;
the upload resolver creates the org directory when needed. The old blanket
claim that this directory is never auto-provisioned is obsolete. A CLI-only
attachment still requires an existing file and directory. Compose can fetch
image previews through `GET /x/media/file`.

**Automation caveat, recorded 2026-09-12:** `resident` and `capture-viewer`
carry agent id `01M0NC3FK8NZD54D0RCCXGFP4M`, which the collector rejected with
`400 invalid agent_id: unknown agent in JWT claim`. The resident service URL
drift was fixed, but its collector binding remained broken. `xproof` and
`estop-drive` were `session_expired`; re-login needs the owner interactively.
These are recorded failures, not working-profile recipes. Recheck current
authentication before relying on them. Live read proofs used the collector's
service-caller contract instead.

***

## Credential setup (vault type `twitter`)

The credential is an OAuth 1.0a quad: API key, API key secret, access token,
access token secret. Two portal traps cost the owner real time on 2026-09-11;
check both BEFORE generating anything in the X developer portal:

1. **The app must be attached to the Pay Per Use project.** A detached app
   authenticates and then fails on the paid endpoints.
2. **Set Read and Write permission BEFORE generating the access token pair.**
   Tokens minted under read-only keep read-only forever; regenerate after
   changing the permission, not before.

Then:

```bash
quox vault create
```

Run this interactively: select `twitter`, give it a display label such as
`X @handle`, enter the four credential values privately and choose it as the
default for that type. Keep the connection test enabled. The old recipe used
an unsupported name option; the current CLI asks for a label. Never paste
credential values into chat.

The setup wizard at `/x` in the dashboard walks a human through the same
steps, traps included. The credential is live-tested with a signed call to
`api.x.com/2/users/me`. `quox x status` runs a fresh credential verification,
so it is not a free local-only status read.

***

## The approval loop

- The card lands in the HITL inbox with **Post / Discard**, a tweet preview
  and a budget line using the org's current cap, not a hardcoded 17.
- **Decide is authenticated and replay-guarded**: the decide endpoint verifies
  approval authenticity against the auth service, and refuses if the bound
  credential changed since the card was minted. Approving the same card twice
  does not post twice.
- Cards carry the draft text and a credential BINDING (an id), never secrets.
- **Budgets are org-scoped platform settings.** Defaults are 17 posts per
  rolling 24 hours, 500 per rolling 30 days and 200 reads per rolling 24 hours.
  `X_DAILY_POST_LIMIT` allows 1 to 100, `X_MONTHLY_POST_LIMIT` 1 to 1500, and
  `X_DAILY_READ_LIMIT` 1 to 1000. These are hard ceilings, not suggestions.
  Human owners and admins edit them on Budget; changes are audited to
  `org_platform_settings_history`. `getOrgLimits` backs status, draft checks,
  read accounting and atomic approval claims. Lowering a cap affects approval
  of an existing unapproved draft. Windows roll from timestamps, not midnight.
- **Approve and post now:** dashboard Compose files a card and drives the
  same approval endpoint as the inbox, for an authorised owner or admin.
- **Approve and schedule:** a human owner or admin approves in dashboard
  Compose now; only publication waits for the chosen time. The collector's
  `POST /x/schedule` requires `requireHumanAdmin`, rejecting service keys and
  agent-operated sessions. Do not use a human session to let an agent bypass
  this boundary. It records the approver and approval/publish timestamps,
  reserves budget at approval and uses `executeXDecision` with `claimHeld` at
  fire time. No second tap or fresh approval card is required then. An
  approver can cancel a pending row from Activity, releasing its reservation.
  Durable backoff permits at most 4 attempts. Rows retire to `published`,
  `failed`, `cancelled` or `needs_review`; an interrupted in-flight publish
  needs human review and is not blindly retried because it may have posted.
- **Scheduled drafting is separate:** the registered `x-scheduled-post`
  QuoxFlow template invokes `xtwitter` on cron to file a fresh approval card.
  A human still approves each draft. It grants no automatic publishing rights.
- **X API cost estimates in the product:** roughly $0.015 per plain post,
  $0.20 per post containing a link and $0.005 per read. Each of the four read
  tools charges one local budget unit per invocation, not per returned tweet.
  Own-timeline reads and mentions also resolve the account through a separate
  API request, without a second local budget charge. These estimates and
  budget units are not a measurement of the final X invoice.
- **Mentions polling:** org opt-in through `X_MENTIONS_POLL_ENABLED`, default
  off, with `X_MENTIONS_POLL_INTERVAL` default `1h`. Budget offers `15m`,
  `30m`, `1h`, `6h` and `daily`, estimated at $14.40, $7.20, $3.60, $0.60 and
  $0.15 per 30 days respectively. Settings resolve each tick without a restart.
  `X_INBOUND_POLL_ENABLED` is the deployment kill switch;
  `X_INBOUND_POLL_ORGS` is only an optional narrowing allowlist. Not-due orgs
  are skipped, not failed; durable pacing is stamped even on failure.

***

## Campaign craft (desk wisdom, 2026-09-11)

The existing skill records the first @Quox_AI campaign's preferences: avoid
hashtags, put the main text and image in the opening post, put a link in a
self-reply, and make room for early conversation. Treat these as historical
editorial choices, not current ranking rules or guaranteed reach gains.

The claims that 3+ hashtags signal spam, links lose 30-50% of reach and
first-hour replies outweigh likes roughly 27x are **unverified in the audited
sources**. Do not present them as facts. A link-bearing self-reply still
incurs the product's estimated link-post cost and another posting budget slot.

OWNER RULING 2026-09-16, reversing the avoid-hashtags line above: @Quox_AI has
zero followers, so drafts now INCLUDE 1-2 targeted hashtags each (real
communities or searches, e.g. #buildinpublic #selfhosted #AIagents, never a
pile). Hashtags cost nothing extra; only links trigger the higher post price.

LAUNCH-STATE HONESTY (lesson, 2026-09-16): the owner rejected a drafted
announcement because it said the plugin "is live in the Quox store" while
quox.ai has not launched (checkout opens on launch day). Before drafting any
promotional tweet, check launch state; pre-launch framing is "we built /
shipping at launch", never "live / buy now". The rejection reason lives on
inbox item 01K2G6RQ6E20H6GGZAT6W6VCT6.

***

## Honest limits

Audit date: **2026-09-12**. The live outcomes below are recorded evidence from
`quox-dashboard/docs/STATUS_AND_LIMITS_X.md`, not live API calls repeated by
this skill audit. Resolve contradictions against current implementation and
the dated evidence: that document still has stale constant-budget and
manual-media-provisioning bullets beneath its updated capability rows.

The requested website checkout lacks `docs/latest/plugins/x.md`. Its content
was read from the same repository at `fe06dfc5` on `x-scheduled-truth`, together
with the store seed. That revision still underclaims reads, settings and the
dashboard tabs. Do not copy those stale claims into guidance.

- **Posting is Stable:** 12 real campaign posts, signed publication, observed
  budget usage and AEE envelopes. Vault verification, resolution and image
  attachment have live evidence. An org limit of 25 was driven through Budget,
  Overview and the approval card on 2026-09-12.
- **All four read tools are Stable and driven live:** `get_tweet`,
  `get_user_tweets`, `search_recent` and `get_mentions`. Proof used the
  collector service-caller path with authenticated org and body `agent_id`.
  Agents can use the connector reads; dashboard Engagement uses
  `get_user_tweets`. **The CLI read parity gap remains open.**
- `search_recent` and `get_user_tweets` accept `max_results` from 1 to 20,
  default 10. The outgoing request widens to X's minimum of 10 for recent
  search and 5 for a user timeline, then slices the returned list locally to
  the requested count. A small requested count no longer causes X's minimum
  window refusal. This fix was exposed and proven during the live read pass.
- **XView is Beta, with seven tabs:** Overview, Compose, Activity, Engagement,
  Budget, Account health and About. Overview is the landing tab. Mount reads
  use local collector data and do not spend X credits. Credential verification
  and Engagement refresh are explicit paid clicks. Engagement displays about
  $0.005 per refresh, not $0.05 for ten posts. Compose-to-card was driven live;
  compose-to-publish through the UI remains undriven. Browser upload is
  implemented; the Compose generation slot is inert, not image generation.
- **Both scheduling lanes are Beta.** A **cron-fired scheduled draft run is
  still undriven**. The timed-publish failure path was driven in the deployed
  collector: approval persisted, a future tick idled, a due tick called X,
  dummy credentials returned 401, and after 4 attempts the row retired and
  released its reservation. A container restart did not re-fire it.
  **A successful timed publish is still undriven.** Shared execution code and
  passing tests do not prove a real post appeared at its scheduled time.
- **Mentions polling remains Experimental:** the per-org controls are built,
  but the poller itself has never been driven against live data. A live
  `get_mentions` result does not prove the polling loop. Failure accounting,
  backoff and retirement are tested with stubs.
- **Media limits:** still images only, up to 4 per post and 5MB each
  (5,242,880 bytes). GIF files pass the allowlist but animated GIF behaviour is
  unproven because no X media category is set. No video, alt text, polls,
  quote posts or reply-control support. A browser preview route existing does
  not prove images render inside the inbox approval card.
- **Not built:** OAuth 2.0, multi-account, per-account automatic posting rules,
  QuoxSignal listening unification and follower-difference monitoring. The
  human pre-authorised scheduling lane does not make agent auto-posting real.
- **Packaging is Beta:** the signed bundle and entitlement gate exist; the
  gate has not been driven on a genuinely unlicensed install. The status
  document records production store and docs publication on 2026-09-12;
  purchase through an unlicensed install and the phone-approval demo remain
  outstanding. Neither local tests nor this audit prove those deployments.

PROXY-CHAIN LESSON (2026-09-16): the browser upload was proven live with a
tiny image, so nginx's default 1m body cap sat unnoticed until the owner
attached a real screenshot and got an HTML 413 that never reached the app.
When driving an upload or size-capped surface, drive it with a
BOUNDARY-SIZED artifact (just under each cap), through the full deployed
proxy chain, not a token file. App-level caps only govern what the layers
in front of them let through.
