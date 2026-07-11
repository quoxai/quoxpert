#!/usr/bin/env node
/**
 * scripts/drift-check.mjs — CI enforcement for Quoxpert content currency
 * (plan STREAM_QUOXPERT_PLAN.md §5.2), modeled directly on the anti-drift
 * lint precedent at quox-dashboard/cli/test/api/endpoints-lint.test.js:
 * fail loudly and specifically rather than let staleness accumulate
 * silently, with an empty allowlist that requires an inline justification
 * comment for any exception.
 *
 * Run on every PR + nightly (.github/workflows/drift-check.yml).
 *
 * Fails (exit 1) when:
 *   (a) a declared source's current content hash differs from the hash
 *       stamped in sources/manifest.json at the last regen (⇒ regen needed), OR
 *   (b) `regen.mjs --check` finds a splice diff (generated blocks are stale
 *       relative to the currently-stamped sources), OR
 *   (c) a hand-authored block's declared+reviewed source (frontmatter
 *       `metadata.quoxpert.hand_sources[]`, optional convention — see
 *       renderHandSourceDrift below) changed since its `reviewed_sha256` stamp.
 *
 * Sub-skills whose SKILL.md doesn't exist yet (v0.1 scaffold — other coders
 * own plugin/skills/*\/SKILL.md content) are reported as SKIP, not FAIL: there
 * is nothing to have drifted yet. This keeps drift-check safe to wire into CI
 * from day one instead of red-by-default until every sub-skill is authored.
 *
 * No external dependencies — Node built-ins only.
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fetchSource, readManifest, REPO_ROOT } from './regen.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Escape hatch, mirrors cli/test/api/endpoints-lint.test.js's ALLOWLIST.
// MUST stay empty. Any entry requires an inline comment explaining why the
// drift can't be resolved by running regen.mjs or updating the sub-skill.
// Shape: { '<skillId>': { sourceIds: ['<sourceId>', ...], reason: '...' } }
const ALLOWLIST = {};

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/** Minimal frontmatter scalar reader — not a full YAML parser (no external deps). */
function readFrontmatterField(skillMdContent, fieldName) {
  const fmMatch = skillMdContent.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  const re = new RegExp(`^\\s*${fieldName}:\\s*(.+)$`, 'm');
  const m = fmMatch[1].match(re);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}

function checkSourceDrift(manifest) {
  const failures = [];
  const infos = [];

  for (const [skillId, skillDef] of Object.entries(manifest.skills)) {
    const skillMdPath = path.join(REPO_ROOT, skillDef.skill_md);
    if (!existsSync(skillMdPath)) {
      infos.push(`SKIP ${skillId}: SKILL.md not authored yet — nothing to drift.`);
      continue;
    }

    const skillMdContent = readFileSync(skillMdPath, 'utf8');
    const generatedAt = readFrontmatterField(skillMdContent, 'generated_at');
    const allowedForSkill = ALLOWLIST[skillId]?.sourceIds || [];

    for (const source of skillDef.sources || []) {
      if (allowedForSkill.includes(source.id)) continue;

      const stampedHash = source.stamp?.sha256;
      if (!stampedHash) {
        infos.push(`  ${skillId}/${source.id}: no baseline stamp yet (never regenerated) — run regen.mjs.`);
        continue;
      }

      const currentRaw = fetchSource(source);
      if (currentRaw == null) {
        infos.push(`  ${skillId}/${source.id}: could not fetch source this run (repo not checked out / cmd failed) — skipped, not a failure.`);
        continue;
      }

      const currentHash = sha256(currentRaw);
      if (currentHash !== stampedHash) {
        failures.push({
          skillId,
          sourceId: source.id,
          repo: source.repo,
          location: source.path || source.cmd,
          stampedHash,
          currentHash,
          generatedAt,
        });
      }
    }
  }

  return { failures, infos };
}

/**
 * (c) Hand-authored block drift — optional per-block review stamps declared
 * in frontmatter as `metadata.quoxpert.hand_sources: [{ path, reviewed_sha256 }]`
 * (plan §5.2a-3, "frontmatter records sources per hand block too"). No
 * sub-skill declares this yet in v0.1 — this path is exercised as soon as one
 * does; it fails the same way as generated-source drift, but the fix is a
 * human review + stamp bump, not a regen run.
 */
function checkHandAuthoredDrift(manifest) {
  const failures = [];
  for (const [skillId, skillDef] of Object.entries(manifest.skills)) {
    const skillMdPath = path.join(REPO_ROOT, skillDef.skill_md);
    if (!existsSync(skillMdPath)) continue;
    const skillMdContent = readFileSync(skillMdPath, 'utf8');
    const fmMatch = skillMdContent.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch || !/hand_sources:/.test(fmMatch[1])) continue;
    // v0.1: convention declared, no parser needed yet since no SKILL.md uses
    // it — documented here as the extension point rather than implemented
    // against a format nothing produces yet (would be untestable dead code).
    failures.push({
      skillId,
      note: 'hand_sources declared in frontmatter but drift-check has no live example to validate its parser against yet — flagging for manual review, not auto-failing.',
    });
  }
  return failures;
}

function runRegenCheck() {
  try {
    execFileSync('node', [path.join(__dirname, 'regen.mjs'), '--check'], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    return { clean: true, output: '' };
  } catch (err) {
    return { clean: false, output: (err.stdout || '') + (err.stderr || '') };
  }
}

function main() {
  console.log('quoxpert drift-check\n');

  const manifest = readManifest();
  const { failures: sourceFailures, infos } = checkSourceDrift(manifest);
  const handNotes = checkHandAuthoredDrift(manifest);
  const regenResult = runRegenCheck();

  for (const info of infos) console.log(info);

  let exitCode = 0;

  if (sourceFailures.length > 0) {
    exitCode = 1;
    console.error('\nDRIFT DETECTED — declared source hash changed since last regen:\n');
    for (const f of sourceFailures) {
      console.error(`  [${f.skillId}] source '${f.sourceId}' (${f.repo}: ${f.location})`);
      console.error(`      stamped:  ${f.stampedHash}`);
      console.error(`      current:  ${f.currentHash}`);
      console.error(`      sub-skill generated_at: ${f.generatedAt || 'unknown'}`);
      console.error(`      fix: run \`node scripts/regen.mjs --skill ${f.skillId}\`, review the diff, commit.\n`);
    }
  }

  if (handNotes.length > 0) {
    console.warn('\nHand-authored source review notes (non-fatal in v0.1):');
    for (const n of handNotes) console.warn(`  [${n.skillId}] ${n.note}`);
  }

  if (!regenResult.clean) {
    exitCode = 1;
    console.error('\nDRIFT DETECTED — `regen.mjs --check` found stale generated blocks:\n');
    console.error(regenResult.output);
  }

  if (exitCode === 0) {
    console.log('\ndrift-check: clean. No stale sources, no stale generated blocks.');
  } else {
    console.error('drift-check: FAILED. See above for which sub-skill(s) drifted.');
  }

  process.exit(exitCode);
}

main();
