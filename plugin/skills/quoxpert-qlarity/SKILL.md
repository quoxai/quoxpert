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
quox qlarity screenshot <url> --session <id> --wait-until load --settle 4000
# NOT networkidle on the QuoxCORE dashboard: its live connections (SSE/polling)
# mean the network never goes idle, so navigation times out and the CLI prints
# only "Server error" (proven 2026-10-07 on https://localhost:3000/ and /evidence).
# Use load + --settle, or --wait-for <css> when you know a landmark element.
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

Update 2026-09-29 (pre-merge review recipe + its dead ends, session ORG-SWITCHER):
`http://localhost:8931` is allowlisted in the QUOX DEV org as the dist preview
server for pre-merge review. To show a worktree build to qlarity: `npm run
build` in the worktree, then `npx vite preview --port 8931 --host` there.
WEBSITE preview (quox-website, quox#734, 2026-10-11): origin
`http://<dev-box-ip>:4173` is allowlisted for QUOX DEV. In a website worktree:
`npm run build && npm run preview:proof` (vite preview, --host 0.0.0.0 --port
4173 --strictPort), then `quox qlarity screenshot http://<dev-box-ip>:4173/<route>`.
Use the LAN IP, never localhost (qlarity's container sees its own localhost).
Stop the preview by PID afterwards. Lazy routes may still show the loader at
capture time (no wait-for verb yet, #756).
GOTCHA: `origins add` needs an org-admin USER session. A profile with no stored
session (e.g. `-p moo` after its tokens lapsed) silently falls back to the
service key and returns `403 ... requires an org admin`; run `quox -p moo login`
first, do not treat it as a permissions problem.
Vite's preview server inherits `server.proxy`, so /api hits the live local
services and login works: no dev-server juggling needed. Three walls found the
same day (filed as quoxai/quox#646): the resident builder role lacks
secrets.write, so a session cannot mint a browser_login cred for a disposable
demo user; a fresh demo org is NOT licensed for Qlarity (`origins add` 403s),
so routing around the role gap via a self-owned org fails too; and there is no
governed interact verb (click/hover), so state-dependent UI (menus, switchers)
cannot be captured short of approval-gated eval. Until #646 moves, interaction
states need the local Playwright fallback, which is exactly the gap-then-fall-
back the rules require you to file, not silently take.

## Gotcha: lazy-loaded content (added 2026-10-05, NOTESQ)
`--settle <ms>` waits after navigation, not for your component. Lazy chunks on a busy box land later, so screenshots show skeletons. Use `--wait-for "<css of the element that proves the feature>"` (optionally `--wait-ms 2000-3000` for animations), and `--selector "<view root>"` to crop to the product and keep flapping footer status chips out of promo shots. A failed `screenshot` (e.g. ERR_CONNECTION_REFUSED) can leave its session open and hit the 3-session org cap: list with `quox qlarity sessions`, free with `quox qlarity close <id>` (quox#680).

## Screenshot viewport and device scale (updated 2026-10-09, quox#735)

`quox qlarity screenshot <url> --viewport 1440x900 --device-scale-factor 2` sets the
capture geometry for that call only (viewport 320x320 to 3840x2160, dsf 1 to 3; default
stays 1280x720 @1x). Qlarity restores the session default afterwards, so a shared or
logged-in session is never left resized. The CLI prints `viewport WxH @Nx` and the
service returns `viewport` and `device_scale_factor` next to the sha256. Phone: `--viewport 390x844`.
Needs the qlarity image and CLI built from the #735 branch; on an older deploy the flag is
unknown. Only `screenshot` takes it (read/console/network do not). For capture-grade
footage beyond 4K, or video, still use quox-screenrecord. An authed dashboard shot shows
the logged-in org's real data (chat titles, avatar, org name): seed a demo org before
capturing anything public, and run an OCR privacy sweep on it.

## Gotcha: a blank or spinning 3D canvas is not evidence of a regression (added 2026-10-07, BRAIN2-UX)
Headless Chromium renders WebGL in software. On a loaded box (load average 20+) R3F pages can sit on their Suspense spinner for over 75s, or mount and draw nothing. Before blaming your change: (1) shoot a control 3D page you did not touch (`/3d-lab`) in the same minute; if it is blank too, the environment is the cause; (2) look for a DOM-level sign the renderer mounted (a caption or overlay it draws); (3) check `docker logs quox-dashboard` for the chunk and model (`.glb`) GETs returning 200. Report the canvas as "not verified headless", never as working.

<!-- >>> tips (generated by sync-quoxpert-tips; do not edit) >>> -->
## Tips users see

Quox shows these one-line tips to users (`quox tips`). Know them so you can point at the right command.

- **Inspect a live page**: `quox qlarity screenshot` (beta; shows when: qlarity)
<!-- <<< tips <<< -->
