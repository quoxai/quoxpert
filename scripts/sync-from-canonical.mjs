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
 * Excluded from the public set (internal-only, owner call): gripe, dev-servers.
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

// Internal-only skills that must NOT ship to the public marketplace.
const EXCLUDE = new Set(['quoxpert-gripe', 'quoxpert-dev-servers']);

// Scrub: internal -> public placeholder. Order matters (specific before generic).
const SCRUB = [
  [/\b192\.168\.88\.247\b/g, '203.0.113.10'],
  [/\b192\.168\.88\.126\b/g, '203.0.113.20'],
  [/\b192\.168\.88\.131\b/g, '203.0.113.31'],
  [/\b192\.168\.\d{1,3}\.\d{1,3}\b/g, '203.0.113.10'],
  [/\b10\.0\.0\.\d{1,3}\b/g, '203.0.113.10'],
  [/\b95\.217\.\d{1,3}\.\d{1,3}\b/g, '198.51.100.10'],
  [/\bquoxdelaclaudicus01\b/gi, 'agent-host-01'],
  [/\bqcore-dev01\b/gi, 'dev-01'],
  [/\baccess01\b/g, 'hyp-01'],
  [/\bpbs01\b/g, 'backup-01'],
  [/\bpve0([1-7])\b/g, 'pve-0$1'],
  [/\bclient0001\b/g, 'client-example'],
  [/\bquoxperticus\d*\b/gi, 'agent-host'],
  [/\bclaudicus\d*\b/gi, 'agent-host'],
  [/\bnodevpn01\b/g, 'vpn-01'],
  [/\bqsec-target01\b/g, 'scan-target-01'],
  [/\/home\/control\//g, '~/'],
  [/\bdoor\.black\b/gi, 'example.com'],
  [/\bpoolpro\b/gi, 'examplecorp'],
  [/\badam@[a-z0-9.-]+/gi, 'user@example.com'],
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
  .filter((n) => !EXCLUDE.has(n))
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

console.log(`\n${DRY ? '[dry-run] ' : ''}sync-from-canonical: ${copied} public skill(s), ${scrubbed} scrubbed, excluded ${[...EXCLUDE].join(', ')}`);
if (orphans.length) console.log(`  ⚠ in repo but NOT in canonical public set (review): ${orphans.join(', ')}`);
if (!DRY) console.log('  next: node scripts/regen.mjs && node scripts/privacy-sweep.mjs && node scripts/package.mjs');
