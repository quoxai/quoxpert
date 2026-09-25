---
name: quoxpert-qlarity
description: "Make any Claude fluent at Qlarity, Quox's governed browser inspection
  for dev servers. Qlarity opens a real page in an isolated headless session and
  answers runtime questions directly: computed styles, pseudo-element rules, DOM
  reads, storage. Load when you need to know what a page is actually doing at
  runtime, when diagnosing a UI or visual bug, or before asking a human to check
  a page for you. Covers the quox qlarity CLI, the dashboard view, the named
  inspectors, and why arbitrary eval is always an approval."
argument-hint: "<task, e.g. 'why is this element invisible', 'read localStorage', 'check a pseudo-element'>"
metadata:
  quoxpert:
    source_repo: qlarity
    stream: DEVSUITE-CLARIFY
license: LicenseRef-SkillRights-Reserved-1.0
---

# Qlarity

**Look at the page yourself, with a receipt.**

Qlarity exists to stop two habits: guessing at runtime state from source, and
asking a human to paste the console. If the answer lives in DevTools and would
take two seconds to look up, look it up.

It is the productised successor to the local `clarify-mcp` tool. **Both exist
today.** Read "Which one to use" below before reaching for either.

---

## The discipline (this matters more than the commands)

**Before asking a human to test anything, inspect it yourself.** No "can you
check the page?", no "does the modal show up?", no "what does the console say?"
unless you have first either inspected it, or can name the specific reason you
could not: the service is unlicensed, the origin is not on the allowlist, the
page is behind a login, or the dev server is down. "Faster if you check" is not
a reason.

If you skip, the skip reason goes in the message **before** the question.

**Do not blame the wrapper before checking pseudo-elements.** The two hardest
local UI bugs on this estate (a double-glass shimmer, an invisible HAL eye)
were both `::before`/`::after` causes misdiagnosed as wrapper or z-index
problems. `pseudo_style` exists specifically for that, and it is one call.

---

## Commands

```bash
quox qlarity health                 # is it up, what does egress allow
quox qlarity allowlist              # which origins may be inspected
quox qlarity inspectors             # the named reads available
quox qlarity sessions               # open sessions for this org
quox qlarity close <sessionId>

# The one you will actually use: open, read, print, close.
quox qlarity read <url> --inspector <name> [--selector <css>] [--json]

# AUTHED inspection (shipped 2026-09-21, DEVSUITE-GRIPE P7): log a session in
# via a vault browser_login credential, then any one-shot ADOPTS the live
# authed session for that origin (or pass --session <id> explicitly).
# The secret is resolved server-side in the collector and never reaches the
# CLI, the response, or the AEE envelope (key names only are witnessed).
quox qlarity login <origin> --credential <browser_login idOrLabel>
quox qlarity screenshot <url> --session <id> --wait-until networkidle --settle 9000
```

Login verdicts carry `evidence_basis` (`session_cookie_set_and_redirected` or
`session_cookie_set_url_unchanged`): trust the basis, and treat a verdict whose
evidence contradicts it as a bug to file, not to explain away.

Worked examples:

```bash
# Why is this element invisible?
quox qlarity read http://localhost:5173/ --inspector computed_style \
  --selector '.card' --properties opacity,visibility,display,z-index

# The pseudo-element check, before blaming the wrapper
quox qlarity read http://localhost:5173/ --inspector pseudo_style --selector '.card'

# What is in storage?
quox qlarity read http://localhost:5173/ --inspector storage --key quox-token

# Does the selector match anything at all?
quox qlarity read http://localhost:5173/ --inspector count --selector '.card'
```

`read` always closes its session, including on failure. A stranded session is a
browser context held on the server until the reaper takes it, and it counts
against the org's concurrency cap meanwhile.

**Announce it**, per the house icon rule (QuoxGlyph grammar): `🔍 QLARITY │ inspecting <url>`.

---

## The named inspectors

They take a **selector and a property, never a code string**.

| Inspector | Use it for |
|---|---|
| `computed_style` | resolved CSS; narrow with `--properties` |
| `pseudo_style` | `::before` / `::after` rules — check this early |
| `text_content` | what an element actually says |
| `attribute` | one attribute of the first match |
| `count` | does the selector match anything |
| `bounding_box` | position and size, for layout questions |
| `storage` | localStorage / sessionStorage, one key or a full dump |

If none fits, **add an inspector**. Do not reach for eval. That is the design,
not a workaround.

---

## Why eval is always an approval

`quox qlarity eval <url> <script>` files a human approval and exits. It does
not run the script.

There is no "read-only JS is fine" tier, because deciding whether an arbitrary
script mutates is undecidable, and any regex or AST heuristic there is security
theatre. The moment a probably-safe path exists, the gate is decorative.

---

## Two refusals you will meet, and what they mean

**`Qlarity is not licensed for this organisation`** — the service is running
and refusing you. That is the licence gate working, not a fault. It needs an
entitlement, not a bug report.

**`egress_denied: not_in_allowlist:<host>`** — the origin is not declared for
this deployment. Default-deny is the policy. Widen it deliberately, and never
with a wildcard: `*` is not an allowlist and the parser rejects it.

Also watch the **blocked** list in a result. If a page looks wrong, look there
first: it lists requests the page made and was refused, and a page that
silently failed to load a subresource looks fine and is not.

---

## Which one to use, today

As of 2026-09-10 Qlarity covers ALL 11 of clarify-mcp's inspection capabilities
(clarify is retired). It does console messages, network errors, screenshots, and
— since 2026-09-10 — DOM tree summaries (`dom_summary`), layout health
(`layout_health`), responsive/device-width sweeps (`responsive_sweep`) and
structured `expect` assertions, all as named inspectors:

    quox qlarity read <url> --inspector dom_summary --depth 3
    quox qlarity read <url> --inspector layout_health
    quox qlarity read <url> --inspector responsive_sweep --widths 375,768,1440 --selector <css>
    quox qlarity read <url> --inspector expect --selector <css> --assert text_contains --value <str>

The one clarify feature deliberately NOT ported is authenticated inspection via a
shared cookie file (a cross-org leak in a multi-tenant service); the sanctioned
replacement is per-org Vault credential injection (deferred, DEVSUITE-CLARIFY
#3603/#3604), and authenticated dashboard *screenshots* ride quox-screenrecord's
headless resident-token mint (`npm run auth:mint`).

- Console, network errors, screenshots, computed styles, pseudo-elements,
  DOM reads, storage → **either**, and Qlarity if the target is governed or
  multi-tenant, or the inspection should leave an evidence trail
- Anything on a shared or customer-facing instance → **Qlarity**, because
  clarify-mcp shares one browser context and persists cookies to disk

Extra commands P5 added:

```bash
quox qlarity read <url> --inspector count --selector x   # then, on the session:
#   GET  /sessions/:id/console   ?level=error
#   GET  /sessions/:id/network
#   POST /sessions/:id/screenshot   { selector?, full_page? }
```

Console capture includes `pageerror`, which is where an uncaught exception
lands and is usually the most useful line on the page. Screenshots return
base64 with a sha256, so the image can be witnessed rather than just viewed.

The retirement plan and its criteria are in `~/qlarity/docs/CLARIFY_RETIREMENT.md`.
Do not switch the house rules to Qlarity until the parity blockers close; the
rules change last, after it is demonstrably better for the case they describe.

---

## Suggested rules

Ship these with the tool, or it doesn't get used. Paste into the consumer's own
`CLAUDE.md` or agent onboarding file:

    ### Qlarity (browser inspection)
    - Before asking a human to check, describe, or test a live dev page,
      inspect it yourself with Qlarity (`quox qlarity read <url> --inspector
      <name>`, the dashboard Qlarity view, or the `qlarity_*` agent tools). A
      runtime or visual question DevTools would answer in seconds, answer it
      directly, don't guess and don't hand it back to the user.
    - If you skip, name the reason first: the service is unlicensed, the origin
      is not on the allowlist, the page is behind a login, or the dev server is
      down. "Faster if you check" is not a reason, and the skip reason goes in
      the message before the question.
    - Diagnosing an invisible or mispositioned element: run the pseudo-element
      check (`--inspector pseudo_style`) before blaming the wrapper or z-index.
      The two hardest UI bugs on this estate were both `::before`/`::after`
      causes misread as wrapper problems.
    - Arbitrary JS (`eval`) is always an approval, never a free read. Reach for
      the named inspectors (computed_style, pseudo_style, storage, count)
      first; eval is the escape hatch and it routes through HITL.
    - Inspection is unauthenticated (it sees what a logged-out visitor sees) and
      the allowlist is per-deployment. Check `quox qlarity health` and
      `STATUS_AND_LIMITS_QLARITY.md` before trusting a result.

---

## Honest limits

Read `~/qlarity/docs/STATUS_AND_LIMITS_QLARITY.md` before trusting any claim
here. As of 2026-07-31: unauthenticated inspection only (it sees what a
logged-out visitor sees), eval unavailable until a HITL sink is wired, and the
allowlist is per-deployment rather than per-org.

Update 2026-09-21: the unauthenticated-only limit is CLOSED for form-login
sites via `quox qlarity login` (vault `browser_login` credential, proven live
against the dev dashboard). Still true: creating the credential needs an org
admin (agents hold read-only vault tools), origins stay deny-by-default, and
eval remains approval-gated.
