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
