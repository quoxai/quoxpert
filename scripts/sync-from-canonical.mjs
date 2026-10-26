#!/usr/bin/env node
/**
 * sync-from-canonical — pull the curated public skill set from the canonical
 * quox-skills tree (~/.claude/skills) into this repo's plugin/skills/, scrubbing
 * internal infra on the way.
 *
 * WHY: owner decision 2026-09-25 made ~/.claude/skills (the quox-skills repo)
 * the SYSTEM OF RECORD for quoxpert skills. This public marketplace repo is
 * downstream: it SOURCES FROM canonical rather than being hand-maintained in
 * parallel (which is how the two diverged in the first place). Run this on the
 * dev box where canonical lives, review the diff, then regen + gate + package.
 *
 * USAGE:
 *   node scripts/sync-from-canonical.mjs [--dry-run]
 *   CANONICAL_ROOT=/path/to/.claude/skills node scripts/sync-from-canonical.mjs
 *
 * AFTER RUNNING (the release chain):
 *   node scripts/regen.mjs               # refresh generated blocks + stamps
 *   node scripts/privacy-sweep.mjs       # gate: 0 findings required
 *   node scripts/package.mjs             # gate: leak-check + build
 *
 * PUBLIC SET is a FAIL-CLOSED ALLOWLIST (owner on-ramp ruling + QUOXON set call,
 * 2026-10-26): only the skills named in INCLUDE below ship. A new canonical skill
 * stays PRIVATE until someone adds it here by name. Excluded (dev-box "Quox builds
 * itself", wrong audience): devsuite, quoxbuild, dev-servers.
 * Scrub mapping mirrors the privacy-sweep + package leak patterns; if you add a
 * pattern there, add the replacement here.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, rmSync, cpSync, statSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(REPO_ROOT, 'plugin', 'skills');
const CANONICAL_ROOT = process.env.CANONICAL_ROOT || path.join(os.homedir(), '.claude', 'skills');
const DRY = process.argv.includes('--dry-run');

// Fail-closed ALLOWLIST: the ONLY skills that ship to the public marketplace.
// A canonical skill not named here stays private by default (owner on-ramp
// ruling + QUOXON set call, 2026-10-26). To add a skill to the public set, add
// its exact dir name here. Out by deliberate omission: quoxpert-devsuite,
// quoxpert-quoxbuild, quoxpert-dev-servers (dev-box "Quox builds itself" tooling).
// NOTE: quoxpert-gripe is included but its recipe must target the CUSTOMER'S own
// issue tracker, not quoxai/*; hold it from a release until that is verified.
const INCLUDE = new Set([
  'quoxpert',
  // CLI reference skills, generated from `quox --help`, public-safe (QUOXON 2026-10-26)
  'quoxpert-cli-org', 'quoxpert-cli-platform', 'quoxpert-cli-governance', 'quoxpert-cli-fleet',
  'quoxpert-cli-build', 'quoxpert-cli-knowledge', 'quoxpert-cli-channels',
  'quoxpert-bastion', 'quoxpert-cli', 'quoxpert-contactsq', 'quoxpert-convert',
  'quoxpert-core', 'quoxpert-deploy', 'quoxpert-discord', 'quoxpert-facebook',
  // 'quoxpert-gripe' HELD: its recipe files to quoxai/* repos; re-add once the
  // recipe targets the customer's own issue tracker (QUOXON flag 2026-10-26).
  'quoxpert-flow', 'quoxpert-hyperion', 'quoxpert-instagram',
  'quoxpert-linkedin', 'quoxpert-lucid', 'quoxpert-mcp', 'quoxpert-notesq',
  'quoxpert-plugin-sdk', 'quoxpert-protocols', 'quoxpert-publish', 'quoxpert-qlarity',
  'quoxpert-qloop', 'quoxpert-qluster', 'quoxpert-quoxidentity', 'quoxpert-quoxperticus',
  'quoxpert-quoxplan', 'quoxpert-quoxseo', 'quoxpert-quoxslots', 'quoxpert-repobrain',
  'quoxpert-security', 'quoxpert-tiktok', 'quoxpert-vault', 'quoxpert-x', 'quoxpert-youtube',
]);

// Scrub: internal -> public placeholder. Order matters (specific before generic).
// Specific estate scrub pairs (real IPs, hostnames, owner company/email, dev-box
// path) live in the gitignored scripts/estate.local.mjs so they are NOT published
// with this tool. The generic RFC1918 CIDRs stay inline and still rewrite our LAN
// IPs. On the dev box the local file is present, so the sync scrubs the full estate;
// a fresh public clone keeps the generic coverage only.
let ESTATE_SCRUB = [];
try { ESTATE_SCRUB = (await import('./estate.local.mjs')).ESTATE_SCRUB } catch { /* public clone: generic scrub only */ }

const SCRUB = [
  [/\b192\.168\.\d{1,3}\.\d{1,3}\b/g, '203.0.113.10'],
  [/\b10\.0\.0\.\d{1,3}\b/g, '203.0.113.10'],
  ...ESTATE_SCRUB,
];

function scrub(text) {
  let out = text;
  for (const [re, rep] of SCRUB) out = out.replace(re, rep);
  return out;
}

if (!existsSync(CANONICAL_ROOT)) {
  console.error(`✖ canonical root not found: ${CANONICAL_ROOT}\n  (run this on the dev box where ~/.claude/skills lives, or set CANONICAL_ROOT)`);
  process.exit(2);
}

const canonSkills = readdirSync(CANONICAL_ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith('quoxpert'))
  .map((d) => d.name)
  .filter((n) => INCLUDE.has(n))
  .sort();

// Canonical quoxpert skills deliberately held PRIVATE (not in the allowlist).
const heldPrivate = readdirSync(CANONICAL_ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith('quoxpert') && !INCLUDE.has(d.name))
  .map((d) => d.name)
  .sort();

let copied = 0, scrubbed = 0, skippedArtifacts = 0;
for (const skill of canonSkills) {
  const srcMd = path.join(CANONICAL_ROOT, skill, 'SKILL.md');
  if (!existsSync(srcMd)) continue;
  const raw = readFileSync(srcMd, 'utf-8');
  const clean = scrub(raw);
  if (clean !== raw) scrubbed++;
  const destDir = path.join(SKILLS_DIR, skill);
  const destMd = path.join(destDir, 'SKILL.md');
  if (DRY) {
    const changed = !existsSync(destMd) || readFileSync(destMd, 'utf-8') !== clean;
    console.log(`  ${changed ? 'WOULD UPDATE' : 'unchanged  '} ${skill}`);
  } else {
    mkdirSync(destDir, { recursive: true });
    // publish SKILL.md only; copy references/ if canonical has one; never .skillrights.*
    writeFileSync(destMd, clean);
    const refSrc = path.join(CANONICAL_ROOT, skill, 'references');
    if (existsSync(refSrc) && statSync(refSrc).isDirectory()) {
      cpSync(refSrc, path.join(destDir, 'references'), { recursive: true });
    }
  }
  copied++;
}

// Report any repo skill that is NOT in the canonical public set (drift the other way).
const repoSkills = existsSync(SKILLS_DIR)
  ? readdirSync(SKILLS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  : [];
const orphans = repoSkills.filter((s) => !canonSkills.includes(s));

console.log(`\n${DRY ? '[dry-run] ' : ''}sync-from-canonical: ${copied} public skill(s), ${scrubbed} scrubbed, held private ${heldPrivate.length} (${heldPrivate.join(', ')})`);
if (orphans.length) console.log(`  ⚠ in repo but NOT in canonical public set (review): ${orphans.join(', ')}`);
if (!DRY) console.log('  next: node scripts/regen.mjs && node scripts/privacy-sweep.mjs && node scripts/package.mjs');
