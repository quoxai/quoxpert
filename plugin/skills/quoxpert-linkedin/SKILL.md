---
name: quoxpert-linkedin
description: "Use the Quox LinkedIn plugin for governed LinkedIn publishing and
  reads. Covers the quox linkedin CLI, the LinkedIn agent, vault credentials
  (pasted 60-day token, tracked expiry), bridge-level HITL on every write,
  licence gates, image-by-URL attach, and the /linkedin dashboard. Load for
  LinkedIn posting, comments, feed reads, credentials or the LinkedIn panels.
  Live proof and undriven capabilities are distinguished explicitly; as of
  2026-09-17 the surface is test-proven but not yet driven against live
  LinkedIn."
argument-hint: "<task, e.g. 'post to the company page', 'check the feed', 'set up the LinkedIn token', 'why is publish pending'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard
    stream: LI-OVERHAUL
    sources:
      - repo: quox-dashboard
        path: docs/STATUS_AND_LIMITS_LINKEDIN.md
      - repo: quox-dashboard
        path: cli/lib/commands/linkedin.js
      - repo: quox-dashboard
        path: services/collector/lib/connectors/types/linkedin.js
      - repo: quox-dashboard
        path: services/collector/lib/connectors/bridge.js
      - repo: quox-dashboard
        path: src/services/linkedinClient.js
      - repo: quox-dashboard
        path: src/pages/views/LinkedInView.jsx
---

# Quoxpert: LinkedIn plugin (governed publishing)

The truth ledger is `quox-dashboard/docs/STATUS_AND_LIMITS_LINKEDIN.md` — read it
before promising anyone anything. History that shapes everything here: the first
LinkedIn UI shipped calling routes that never existed and was dead for ~6 months
behind green mocked tests. LI-OVERHAUL (#480, 2026-09-16/17) rebuilt the surface
with the guard tests that make that impossible to repeat.

## The model (same governance shape as X, different mechanics)

- **Writes are connector tools gated at the bridge choke.** `linkedin_publish_post`
  and `linkedin_create_comment` carry `requiresApproval: true` in their tool
  definitions; `executeConnectorTool` wraps them in the real `withApprovalGate`.
  EVERY path crosses this choke: agent chat, the dashboard Compose panel, the
  generic connectors route, the CLI. There is no direct-publish lane anywhere.
- **A write call returns pending, not success**: `{ pending: true,
  status: 'awaiting_approval', approvalId, inbox_item_id }`. That is the CORRECT
  outcome — the post exists only as an approval card until a human approves it
  from Inbox-Q (renders as a LinkedIn-typed post preview). "Request Changes" and
  any other non-approve action NEVER executes (fail-closed since 2026-09-17; it
  used to). An approved execution that fails finalizes as error AND mints an
  incident inbox item.
- **Reads execute directly** (get_posts, get_post, get_engagement, get_comments,
  get_org_info). No per-call dollar cost (unlike X) — only LinkedIn's own program
  quotas. There are NO posting budgets by design.
- **Licence**: all 8 capabilities need the `linkedin` plugin entitlement,
  enforced server-side before vault resolution. A refusal names the entitlement.

## Credentials (vault, NOT OAuth)

Type `linkedin`, single field `access_token` — a pasted OAuth token from
LinkedIn's token tool. There are NO backend LinkedIn OAuth routes; a broker is
future work. Tokens live exactly 60 days with no refresh for standard apps:
- `expires_at` is stamped automatically at save and re-stamped on rotate.
- The health scanner mints an org-admin inbox warning at <=7 days (incident when
  expired); AccountHealthPanel shows a countdown (amber <=14d, red <=7d).
- Scopes for full function: `w_member_social`, `w_organization_social`,
  `r_organization_social`, `rw_organization_admin` (org page details, needs the
  ADMINISTRATOR role), plus `r_organization_social_feed` /
  `w_organization_social_feed` / `w_member_social_feed` for comments/reactions.

## CLI (wire-tested; live runs pending first credential)

```
quox linkedin post "text" --as urn:li:organization:12345 [--visibility PUBLIC|CONNECTIONS] [--link URL] [--image-url https://...]
quox linkedin comment urn:li:share:123 "text" --as urn:li:organization:12345
quox linkedin posts urn:li:organization:12345 [--count 20]
quox linkedin org 12345          # also the cheapest live credential check
```
Writes print the inbox item id and the `quox inbox respond <id> --action approve`
line. `--as` is required on writes: LinkedIn addresses everything by URN
(`urn:li:person:xxx` member, `urn:li:organization:NNN` org page) and the CLI does
not guess. There is no `status` verb yet — `org` doubles as the health check.

## Images

URL-only (`--image-url` / Compose's Image URL field): the collector fetches the
https source itself (SSRF-guarded: connect-time DNS pinning, no redirects, no
private/LAN targets, 10MB streamed cap), PUTs it to LinkedIn, and waits for the
image to reach AVAILABLE (~20s budget; says so honestly if still processing).
publish_post re-checks readiness at publish time and refuses to ship a post that
would render without its image. No browser file upload (X has one; LinkedIn does
not yet).

## Gotchas that already bit someone

- **LinkedIn-Version is pinned to 202609** (sunset 2027-09-15) in
  `connectors/types/linkedin.js`. The version is monthly and retired versions
  hard-fail; when it next goes stale, re-verify all 8 tool contracts against the
  current li-lms docs before bumping (the 202401->202609 migration found two
  real contract bugs: the missing `q=author` finder param and the follower-total
  move to `/rest/networkSizes`).
- **The post URN comes from the `x-restli-id` RESPONSE HEADER**, not the body
  (LinkedIn answers 201 with an empty body). Anything parsing the body for it
  reports `post_urn: 'created'`.
- **A dead token must never read as Connected**: get_org_info throws on a failed
  org lookup precisely so the health panel classifies token_rejected. Do not
  "defensively" swallow provider errors there.
- **Known platform residue quox#546**: the inbox respond route enforces only org
  membership, not the declared approvers — single-admin installs unaffected.

## What is NOT built (do not promise)

Scheduling lanes, mentions/comments polling, engagement writes (reactions),
browser file upload, OAuth broker, multi-account, quox.ai store pages. X's
scheduler is the template when any of these are wanted.
