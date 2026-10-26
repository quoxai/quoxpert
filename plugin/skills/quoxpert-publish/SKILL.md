---
name: quoxpert-publish
description: "Honest stub on distributing and monetising a Quox plugin.
  Covers what's real today (Ed25519 signing, licence generation, manifest
  marketplace fields, manual sideload install) and what isn't live yet
  (marketplace listing, payments, review pipeline). Load when a user asks
  about publishing, selling, or listing a plugin."
argument-hint: "<question, e.g. 'can I sell my plugin' or 'how do I sign it'>"
metadata:
  quoxpert:
    source_repo: quox-plugin-sdk (scripts/sign-plugin.js, scripts/generate-license.js) + quox-dashboard (cli/plugin, manifest marketplace fields)
    sources:
      - repo: quox-plugin-sdk
        path: scripts/sign-plugin.js
      - repo: quox-plugin-sdk
        path: scripts/generate-license.js
    generated_at: 2026-07-25
    quox_version: ">=0.1 pre-1.0"
license: LicenseRef-SkillRights-Reserved-1.0
---

# Quoxpert: Publishing a Plugin (honest stub)

This is a short, deliberately honest skill. There is no marketplace launch to
sell here, just what's real today for getting a plugin into a customer's
hands, and what isn't built yet.

## When (not) to use this sub-skill

**Use it when:** the user asks whether they can sell, list, sign, or licence
a plugin they've built.

**Don't use it for:** building or installing the plugin itself →
`quoxpert-plugin-sdk`. Converting an existing tool into a plugin first →
`quoxpert-convert`.

## What exists today

- **Ed25519 signing.** `node scripts/generate-signing-key.js` produces a
  keypair; `node scripts/sign-plugin.js --plugin ./my-plugin.quoxplugin --key
  ./quox-signing.key` signs the built `.quoxplugin` and bundles a
  `signature.json` into it. An org can register trusted signing keys
  (`quox plugin trusted-keys`) so only plugins signed by a key it trusts
  install without a warning.
- **Licence generation.** `node scripts/generate-license.js --plugin
  my-plugin --customer "Acme Corp" --expires 2027-12-31 --key
  ./quox-signing.key` produces a per-customer, time-bound licence file tied
  to the same signing key.
- **Manifest marketplace fields.** The manifest schema already has
  `heroGradient`, `accentColor`, `badge`, `testimonials[]`, and
  `marketingPoints[]`, ready for a future storefront to render, even though
  nothing reads them yet.
- **Manual sideload install.** The only distribution path today: hand the
  customer the `.quoxplugin` file (plus its signature and licence, if
  signed), and they run `quox plugin install --manifest ... --bundle ...
  --signature ...` on their own instance (full command in
  `quoxpert-plugin-sdk`).

## What does not exist yet

- **No marketplace listing.** There is nowhere a customer browses and
  installs a plugin themselves; distribution is a direct file handoff only.
- **No payments.** No checkout, no billing tied to a licence file. A licence
  proves entitlement; it doesn't collect money.
- **No review pipeline.** Nothing vets a plugin before a customer installs
  it, beyond that org's own trusted-signing-key policy.
- **Coming: the residency program is the current path.** A developer who
  wants to distribute a plugin more broadly than one-to-one sideload needs a
  direct conversation with Quox, not a self-serve flow. Contact via quox.ai.

## Don't oversell this

If a user asks "can I publish to a marketplace" or "can I charge for it
automatically," the honest answer is: not yet, self-serve. Signing and
licensing give the cryptographic building blocks a paid-distribution model
will eventually use; sideload plus a direct agreement with the customer is
how it actually ships today.

## Where to go next

- Build, sign, and install the plugin itself → `quoxpert-plugin-sdk`
- Converting an existing tool into a plugin first → `quoxpert-convert`

## npm publishing (added 2026-09-10, SKILLRIGHTS session: three gotchas that each cost a failed run)

- **Trusted Publishing (OIDC, tokenless) is the house pattern** (matches quoxproof
  on PyPI): workflow needs `permissions: id-token: write`, NO registry-url/token
  scaffolding in setup-node, and `npm install -g npm@latest` FIRST because the
  runner's bundled npm 10 predates OIDC (needs >= 11.5); with old npm the publish
  goes out with setup-node's placeholder token and 404s.
- **npm's Trusted Publisher form composes org/repo itself**: the Repository field
  takes the BARE repo name (`skillrights`), not `owner/repo`; the wrong form saves
  fine and then every publish dies ENEEDAUTH with no hint. The record is immutable
  by design: fix = delete + recreate.
- **Force-pushing a tag at the same commit does not retrigger the workflow** (no
  event fires): push a NEW tag matching the trigger pattern to rerun.

## quoxcli release bumps (added 2026-10-16, QUOXCLI-031 preparing 0.3.1)
- **The version lives in 7 places**: `cli/package.json`, `cli/package-lock.json` (lines 3 and 9),
  `cli/lib/core/version.js` BASE_VERSION, the defaults in `cli/lib/quoxon/main.js` and
  `cli/lib/quoxon/onboarding/view.js`, and pinned literals in `cli/lib/core/version.test.js` and
  `cli/test/version.test.js` (including regexes like `/^0\.3\.0 /`, which a plain `grep 0.3.0` misses;
  grep `0\\\.3\\\.0` too). Leave `whatsnew.jsonl` `since` fields alone: they are history.
- **LOOSEN-GUARD refuses the bump**: changing a pinned version literal in a test counts as loosening, and
  there is no skip. File `quox ask --session <NAME> --yn --high-risk` listing every flagged line (run
  `node scripts/guards/check-test-loosening.mjs --staged --strict --msg-file <f>` first to get the full
  list), then commit with the `Loosening-Approved:` and `Loosening-Attestation:` trailers after a human
  PIN-approves it. Budget for that round-trip.
- **Prove #1134 on the artifact, not the tree**: pack, install the tarball into a throwaway `--prefix`
  with a fresh HOME, walk every top-level `--help`, and grep for `website-login website-logout reissue
  catalogue-sign`. They legitimately remain as `never` deny rows in `lib/quoxon/slash/cliLeaves.json`.
- **`quox offload --worker <name>` cannot lease a new VM from an agent profile** (HTTP 403, needs a human
  profile); reuse the shared worker with `quox offload --dir <dir> -- ...`.
