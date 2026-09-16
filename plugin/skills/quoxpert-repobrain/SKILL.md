---
name: quoxpert-repobrain
license: LicenseRef-SkillRights-NoTrain-1.0
description: "Make any Claude fluent at RepoBrain, Quox's code-intelligence engine.
  Structure-first code retrieval (definitions, imports, file:line citations) that
  returns the right ~240 tokens instead of a 10,000-token file dump. Load when the
  user wants their agents to search a codebase, cite code, map blast radius, or
  connect and index repos, and to learn the discipline of reaching for it before grep."
argument-hint: "<task, e.g. 'where is X', 'what imports Y', 'connect a repo'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard (services/repobrain/)
    sources:
      - repo: quox-dashboard
        path: docs/STREAM_QUOX_REPOBRAIN_PLAN.md
      - repo: quox-dashboard
        path: services/repobrain/repobrain/portal/routes/targets.py
      - repo: quox-dashboard
        cmd: "repobrain query --help"
    generated_at: 2026-07-25
    quox_version: ">=0.1 pre-1.0"
---

# Quoxpert: RepoBrain (Code Intelligence)

## What this is

RepoBrain is Quox's code-intelligence engine, now a governed plugin. It indexes a
repository (any git repo, local or remote) and answers questions about it with
**structure-first retrieval**: FTS5 full-text + a symbol index (definitions) + an
import graph (how files connect). A query returns targeted snippets **with file:line
citations**, roughly 240 tokens of the right code, instead of a whole 10,000-token
file. That is about **42x cheaper** than reading files, and the answer is grounded:
your agents cite `path:line`, they do not guess.

The query face is called **Nucleus**; the product brand is **RepoBrain**; the
internal plugin id is `quox-nucleus`. RepoBrain is the peer of **Brain2** (the "two
brains"): RepoBrain reads and maps code, Brain2 remembers everything. A bridge feeds
your indexed code into Brain2 as neurons (files) and axons (imports), so it renders
in the living brain.

## When to use RepoBrain (reach for it BEFORE grep)

This is the whole point of the skill, so it is a rule, not a suggestion. Use
`repobrain query` as your **first move**, not grep/glob/read, for any of these:

- "Where is X?" / "How does Y work?" / "What depends on Z?"
- You need to find a file, component, function, or class you have not seen yet.
- You are about to grep for a symbol name, RepoBrain knows definitions.
- You are starting a task and need to map which files are involved.
- Any question about code structure, architecture, or "how does X flow".
- Before editing a hub file, ask "what imports `<file>`?" for blast radius.

**Fall back to grep/read ONLY when:** searching a regex/literal pattern, counting
occurrences, reading a file you just edited (the index may be stale for your
uncommitted change), or the file is tiny and you already know its path.

**Two-step pattern:** `repobrain query` gives you `file:line`, then `Read` just that
section. Do not read the whole file.

**Announce it.** Print `🧠 REPOBRAIN: Querying "..."` before a query and
`🧠 REPOBRAIN: Found N results in Xms` after. The user must see the tool being used,
adoption is visible or it does not happen.

## The CLI

    repobrain query "how does auth mount order work"     # default target repo
    repobrain query "what imports AuthContext"            # blast radius
    repobrain query "..." -t quoxflow                     # a different target repo
    repobrain query "..." -x quox-dashboard,quoxflow,aee  # cross-repo fan-out

Output is targeted snippets with `path:line` headers, ranked, budget-packed. It is
built to be pasted straight into your reasoning, not skimmed.

## Connect and index a repo (the governed front door)

Two entry points in the RepoBrain plugin dashboard (the Repos tab under
`/nucleus`), both routed through the governed proxy:

1. **Paste a repo URL + pin** (branch/tag/commit). The engine clones and indexes it.
2. **Connect GitHub** and pick repos from the org-scoped credential the `github`
   plugin already manages.

Local-path targets index **in place** (no second clone) and auto-reindex on file
change via a watcher. Remote targets clone once and reindex on manual trigger. Every
call is org-scoped, license-gated, provenanced, and audited.

## The governed API (for agents/tools, not humans)

Agent and tool calls do not hit the engine directly, they go through the collector's
governed proxy at `/api/v1/nucleus/*`, which resolves the caller's org, gates on the
`quox-nucleus` entitlement (fail-closed), attaches the org header, and emits a VOLT
audit event. Per-org "connectable backends" let an org point at its own RepoBrain
instance (code never leaves its box), with a zero-config bundled default for small
deployments. You never paste a backend URL or key into chat, the org registers it
once in the connection registry and the proxy resolves it.

## When NOT to use this sub-skill

- Operating Quox generally (agents, workflows, fleet) → `quoxpert-cli` / `quoxpert-mcp`.
- The knowledge graph of everything (notes, sources, memory), not code structure →
  that is **Brain2** (RepoBrain's peer), a different surface.
- Building a `.quoxplugin` → `quoxpert-plugin-sdk`.

## The adoption rules (ship these, they are the deliverable)

A tool only gets used if the tools + skills + **rules** arrive together. Package this
discipline for a customer's agents from day one, not as an afterthought: the rule
belongs in the customer's own agent onboarding/rules file, not just in this skill's
prose:

1. **RepoBrain before grep** for any "where/how/what-depends" question. It is 42x
   cheaper and returns definitions, not text matches.
2. **Announce every query** (`🧠 REPOBRAIN:` before and after) so usage is visible.
3. **Two-step:** query for `file:line`, then Read only that section.
4. **Blast radius before hub edits:** `repobrain query "what imports <file>?"` before
   touching anything imported by many files.
5. **Trust the live index, report drift:** if a result disagrees with the code on
   disk (you just edited it, or the index is stale), trust disk and reindex, do not
   guess around it.

Wire these into the customer's agent rules/onboarding, not just their docs. Getting
it used is as important as building or installing it.

## Staying current

Facts here are versioned against a `quox_version`. If a recipe disagrees with your
live instance (a route renamed, a flag changed), trust the instance and file it as a
drift bug, do not guess. The engine internals live in `services/repobrain/`; the
governance seam is the collector proxy `/api/v1/nucleus/*`.
