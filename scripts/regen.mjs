#!/usr/bin/env node
/**
 * scripts/regen.mjs — Quoxpert regen pipeline (plan STREAM_QUOXPERT_PLAN.md §4).
 *
 * Reads sources/manifest.json (which inputs feed which sub-skill), fetches each
 * declared input (local file on disk under a sibling repo checkout, a section of
 * a file, or a shell command's stdout), renders deterministic generated blocks
 * from small per-block templates, and splices them into each sub-skill's
 * SKILL.md between `<!-- quoxpert:generated:start <id> -->` / `<!-- quoxpert:generated:end <id> -->`
 * markers. Hand-authored prose outside the markers is never touched.
 *
 * Usage:
 *   node scripts/regen.mjs                    # regen every sub-skill, write files + update manifest stamps
 *   node scripts/regen.mjs --skill quoxpert-cli
 *   node scripts/regen.mjs --check             # dry run: compute in-memory, exit 1 on any diff (CI mode)
 *
 * No external dependencies — Node built-ins only (fs, path, crypto, child_process, url).
 *
 * v0.1 scope (per task brief): the marker-replace engine is real and fully working.
 * Two real generators are implemented end-to-end:
 *   - quoxpert-cli "command-map"   <- CODEBASE_MAP.md "## CLI Commands (QuoxCLI)" table
 *   - quoxpert-core "counts"       <- CODEBASE_MAP.md "## Metrics" table (plugin/agent counts)
 * All other declared generated blocks are left as TODO stubs (see GENERATORS below) —
 * regen.mjs still runs, still finds/creates their markers, still updates stamps for
 * their declared sources, it just doesn't have a renderer for them yet.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(REPO_ROOT, 'sources', 'manifest.json');

const MARKER_START = (id) => new RegExp(`<!--\\s*quoxpert:generated:start\\s+${escapeRe(id)}\\s*-->`);
const MARKER_END = (id) => new RegExp(`<!--\\s*quoxpert:generated:end\\s+${escapeRe(id)}\\s*-->`);

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveRepoRoot(repoName) {
  const root = process.env.QUOXPERT_REPOS_ROOT || path.resolve(REPO_ROOT, '..');
  return path.join(root, repoName);
}

function readManifest() {
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
}

function writeManifest(manifest) {
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function defaultOnSkip(source, reason) {
  console.warn(`  [warn] could not fetch source ${source.id} (${source.repo}): ${reason}`);
}

/**
 * Resolve a declared source to its current raw content string.
 * Returns null if the source can't be reached; regen must not crash the
 * whole run because one repo isn't checked out locally (e.g. running in a
 * CI runner that only has quoxpert cloned). Every non-null-by-design skip
 * (missing file, missing heading, failed command) calls `onSkip(source,
 * reason)` so the caller can report it and (in regen.mjs's case) fail the
 * run — see the QSDK-SKILLS audit fix note on regenSkill() below. `url`
 * sources are the one deliberate exception: v0.1 does not fetch network
 * URLs at all (no external deps, CI runners may lack egress), so returning
 * null there is expected behavior, not a failure, and does NOT call onSkip.
 */
function fetchSource(source, onSkip = defaultOnSkip) {
  try {
    if (source.type === 'file' || source.type === 'file-section') {
      const filePath = path.join(resolveRepoRoot(source.repo), source.path);
      if (!existsSync(filePath)) {
        onSkip(source, `file not found: ${filePath}`);
        return null;
      }
      const raw = readFileSync(filePath, 'utf8');
      if (source.type === 'file-section') {
        const section = extractMarkdownSection(raw, source.section);
        if (section == null) {
          onSkip(source, `heading "${source.section}" not found in ${filePath}`);
          return null;
        }
        return section;
      }
      return raw;
    }
    if (source.type === 'cmd') {
      const repoRoot = resolveRepoRoot(source.repo);
      const cwd = existsSync(repoRoot) ? repoRoot : REPO_ROOT;
      return execFileSync(source.cmd, { shell: true, cwd, encoding: 'utf8', timeout: 15000 });
    }
    if (source.type === 'url') {
      // Best-effort only — v0.1 does not fetch network URLs (no external deps,
      // and CI runners may not have network egress). Recorded as a TODO input;
      // hash stays null until a fetch step is added. Not a skip: expected.
      return null;
    }
  } catch (err) {
    onSkip(source, err.message);
    return null;
  }
  return null;
}

/** Extract the body of a markdown "## <heading>" section (up to the next same-or-higher heading). */
function extractMarkdownSection(markdown, headingText) {
  const lines = markdown.split('\n');
  const headingRe = /^(#{1,6})\s+(.*)$/;
  let startIdx = -1;
  let startLevel = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(headingRe);
    if (m && m[2].trim() === headingText.trim()) {
      startIdx = i;
      startLevel = m[1].length;
      break;
    }
  }
  if (startIdx === -1) return null;
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const m = lines[i].match(headingRe);
    if (m && m[1].length <= startLevel) {
      endIdx = i;
      break;
    }
  }
  return lines.slice(startIdx, endIdx).join('\n');
}

/** Parse a GFM `| a | b |` table into rows of cells (skips the header separator row). */
function parseMarkdownTable(sectionText) {
  if (!sectionText) return [];
  const rows = [];
  for (const line of sectionText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    if (/^\|[\s:|-]+\|$/.test(trimmed)) continue; // separator row (---|---)
    const cells = trimmed
      .slice(1, trimmed.endsWith('|') ? -1 : undefined)
      .split('|')
      .map((c) => c.trim());
    rows.push(cells);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Generators: blockId -> (sourcesById) => rendered markdown string | null
// Each generator returns null if it can't render (missing source) — regen
// then leaves that block untouched and reports it in the TODO list.
// ---------------------------------------------------------------------------

const GENERATORS = {
  /** quoxpert-cli's "command-map" block, rendered from CODEBASE_MAP.md's CLI table. */
  'command-map': (sourcesById) => {
    const raw = sourcesById['cli-command-map'];
    if (!raw) return null;
    const rows = parseMarkdownTable(raw).filter((r) => r.length >= 2 && r[0] !== 'Command');
    if (rows.length === 0) return null;
    const lines = ['| Command | Purpose |', '|---|---|'];
    for (const [cmd, purpose] of rows) lines.push(`| ${cmd} | ${purpose} |`);
    return lines.join('\n');
  },

  /** quoxpert-core's "counts" block, rendered from CODEBASE_MAP.md's Metrics table. */
  counts: (sourcesById) => {
    const raw = sourcesById['codebase-map'];
    if (!raw) return null;
    const section = extractMarkdownSection(raw, 'Metrics');
    if (!section) return null;
    const rows = parseMarkdownTable(section).filter((r) => r.length >= 2 && r[0] !== 'Metric');
    if (rows.length === 0) return null;
    const wanted = ['Plugins', 'Agents (registry)', 'Services (registry)', 'Routes (routeRegistry paths)'];
    const lines = ['| Metric | Count |', '|---|---|'];
    for (const row of rows) {
      if (wanted.includes(row[0])) lines.push(`| ${row[0]} | ${row[1]} |`);
    }
    return lines.length > 2 ? lines.join('\n') : null;
  },

  /**
   * quoxpert-mcp's "tool-surface-counts" block, parsed from quoxmcp's own
   * manifest.json (`.mcpb` bundle definition) description field: the
   * canonical baseline count for the shipped adapter (QSDK-SKILLS audit
   * 2026-07-25: quoxmcp/README.md's architecture-diagram caption said "83+",
   * quoxpert-mcp said "139 tools, 8 resources", both wrong; manifest.json
   * is ground truth and its own bundled server.js startup transcript matches
   * it exactly).
   */
  'tool-surface-counts': (sourcesById) => {
    const raw = sourcesById['quoxmcp-manifest'];
    if (!raw) return null;
    let manifest;
    try {
      manifest = JSON.parse(raw);
    } catch {
      return null;
    }
    const desc = manifest.description || '';
    const m = desc.match(/([\d]+\+?)\s+infrastructure tools,\s+(\d+)\s+resources,\s+and\s+(\d+)\s+operational prompts/i);
    if (!m) return null;
    const [, tools, resources, prompts] = m;
    return `**${tools} tools, ${resources} resources, ${prompts} prompts**, from quoxmcp's \`manifest.json\` (the ` +
      `\`.mcpb\` bundle definition, the canonical count for the shipped adapter as of ` +
      `\`quoxmcp\` v${manifest.version || '?'}).`;
  },
};

// ---------------------------------------------------------------------------

function findMarkers(skillMdContent) {
  const found = [];
  const startRe = /<!--\s*quoxpert:generated:start\s+([a-zA-Z0-9_-]+)\s*-->/g;
  let m;
  while ((m = startRe.exec(skillMdContent))) found.push(m[1]);
  return found;
}

function spliceGeneratedBlock(content, blockId, newBody) {
  const startRe = MARKER_START(blockId);
  const endRe = MARKER_END(blockId);
  const startMatch = content.match(startRe);
  const endMatch = content.match(endRe);
  if (!startMatch || !endMatch) return { content, changed: false, found: false };
  const startIdx = startMatch.index + startMatch[0].length;
  const endIdx = endMatch.index;
  if (endIdx < startIdx) return { content, changed: false, found: true };
  const before = content.slice(0, startIdx);
  const after = content.slice(endIdx);
  const spliced = `${before}\n${newBody}\n${after}`;
  return { content: spliced, changed: spliced !== content, found: true };
}

function regenSkill(skillId, skillDef, { check }) {
  const skillMdPath = path.join(REPO_ROOT, skillDef.skill_md);
  const report = {
    skillId,
    updatedBlocks: [],
    missingBlocks: [],
    staleSources: [],
    skippedSources: [], // QSDK-SKILLS audit fix: sources whose fetch genuinely
    // failed this run (not the deliberately-unimplemented 'url' type). A
    // failed source never gets its stamp touched (checked_at stays whatever
    // it was, possibly null), and any entry here fails the whole run: see
    // main()'s exit-code handling. This is what would have caught the
    // 'quox --help-json' / dead CODEBASE_MAP.md section breakage instead of
    // it silently degrading to a permanent "never regenerated" no-op.
    skippedNoFile: false,
  };

  if (!existsSync(skillMdPath)) {
    // v0.1: sub-skill SKILL.md files are authored by other coders and may not
    // exist yet. regen still fetches + stamps sources (so drift-check has a
    // baseline) but has nothing to splice into.
    report.skippedNoFile = true;
  }

  const sourcesById = {};
  for (const source of skillDef.sources || []) {
    if (source.type === 'url') {
      // Deliberately unimplemented in v0.1 (see fetchSource's url branch);
      // not a skip, not stamped, not counted as a failure.
      continue;
    }
    let skipReason = null;
    const raw = fetchSource(source, (_src, reason) => {
      skipReason = reason;
    });
    if (raw != null) {
      sourcesById[source.id] = raw;
      const newHash = sha256(raw);
      if (source.stamp.sha256 && source.stamp.sha256 !== newHash) {
        report.staleSources.push({ id: source.id, oldHash: source.stamp.sha256, newHash });
      }
      if (!check) {
        source.stamp.sha256 = newHash;
        source.stamp.checked_at = new Date().toISOString();
      }
    } else {
      // Never touch stamp.checked_at on a failed fetch: an untouched stamp
      // is the honest record that this source has not been confirmed since
      // its last successful regen (or never, if stamp.sha256 is still null).
      report.skippedSources.push({ id: source.id, reason: skipReason || 'no content returned' });
    }
  }

  if (report.skippedNoFile) return report;

  let content = readFileSync(skillMdPath, 'utf8');
  const markerIds = findMarkers(content);
  const feedsMap = {}; // blockId -> [sourceId,...]
  for (const source of skillDef.sources || []) {
    for (const blockId of source.feeds || []) {
      feedsMap[blockId] = feedsMap[blockId] || [];
      feedsMap[blockId].push(source.id);
    }
  }

  for (const blockId of markerIds) {
    const generator = GENERATORS[blockId];
    if (!generator) {
      report.missingBlocks.push(blockId); // TODO generator not implemented yet
      continue;
    }
    const rendered = generator(sourcesById);
    if (rendered == null) {
      report.missingBlocks.push(blockId); // source not fetchable this run
      continue;
    }
    const { content: spliced, changed, found } = spliceGeneratedBlock(content, blockId, rendered);
    if (found && changed) {
      content = spliced;
      report.updatedBlocks.push(blockId);
    }
  }

  if (!check && report.updatedBlocks.length > 0) {
    writeFileSync(skillMdPath, content);
  }
  report.wouldChange = report.updatedBlocks.length > 0;
  return report;
}

// Exported for reuse by scripts/drift-check.mjs (same fetch/hash logic, no
// external deps, avoids re-implementing source resolution twice).
export { fetchSource, resolveRepoRoot, sha256, readManifest, REPO_ROOT, MANIFEST_PATH };

function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const skillFlagIdx = args.indexOf('--skill');
  const onlySkill = skillFlagIdx !== -1 ? args[skillFlagIdx + 1] : null;

  const manifest = readManifest();
  const skillIds = Object.keys(manifest.skills).filter((id) => !onlySkill || id === onlySkill);

  if (skillIds.length === 0) {
    console.error(`No matching skill(s) found${onlySkill ? ` for --skill ${onlySkill}` : ''}.`);
    process.exit(1);
  }

  console.log(`quoxpert regen — ${check ? 'CHECK (dry run)' : 'WRITE'} mode, ${skillIds.length} skill(s)`);

  const reports = [];
  for (const skillId of skillIds) {
    const report = regenSkill(skillId, manifest.skills[skillId], { check });
    reports.push(report);
  }

  if (!check) writeManifest(manifest);

  console.log('');
  for (const r of reports) {
    if (r.skippedNoFile) {
      console.log(`  ${r.skillId}: SKIP (SKILL.md not yet authored — sources stamped, nothing to splice)`);
    } else {
      const bits = [];
      if (r.updatedBlocks.length) bits.push(`updated: ${r.updatedBlocks.join(', ')}`);
      if (r.missingBlocks.length) bits.push(`TODO (no generator/source yet): ${r.missingBlocks.join(', ')}`);
      console.log(`  ${r.skillId}: ${bits.join(' | ') || 'no generated-block markers found'}`);
      if (r.staleSources.length) {
        for (const s of r.staleSources) {
          console.log(`      [human review] source '${s.id}' changed since last stamp (${s.oldHash.slice(0, 8)} -> ${s.newHash.slice(0, 8)})`);
        }
      }
    }
    if (r.skippedSources.length) {
      for (const s of r.skippedSources) {
        console.log(`      [SKIPPED] source '${s.id}': ${s.reason}`);
      }
    }
  }

  const anyChanged = reports.some((r) => r.wouldChange);
  const anySkipped = reports.some((r) => r.skippedSources.length > 0);

  if (anySkipped) {
    console.error(
      '\nregen: one or more declared sources could not be fetched this run (see [SKIPPED] lines above).'
    );
    console.error(
      'Fix the source (repo/path/cmd in sources/manifest.json) before this can pass in CI; checked_at was NOT bumped for these.'
    );
  }

  if (check) {
    if (anyChanged) {
      console.error('\nregen --check: generated blocks are STALE. Run `node scripts/regen.mjs` to fix.');
    }
    if (anyChanged || anySkipped) process.exit(1);
    console.log('\nregen --check: clean, no drift.');
    process.exit(0);
  }

  console.log(`\nregen: done${anyChanged ? ' (files updated)' : ' (no changes)'}.`);
  if (anySkipped) process.exit(1);
}

// Only run as a CLI when executed directly (`node scripts/regen.mjs`), not
// when imported by scripts/drift-check.mjs.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
