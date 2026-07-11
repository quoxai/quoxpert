#!/usr/bin/env node
/**
 * scripts/package.mjs — emits QuoxPert release artifacts into dist/
 * (plan STREAM_QUOXPERT_PLAN.md §6.2 channels B + D, shipped from day one):
 *
 *   dist/plugin/                     — the plugin dir, copied verbatim (channel A source)
 *   dist/skills/<skill-id>.zip       — one ZIP per sub-skill (channel D, for claude.ai/Desktop upload)
 *   dist/quoxpert-plugin.zip         — the whole plugin dir zipped
 *   dist/install.sh                  — copy of the curl installer (channel B)
 *
 * Before writing anything, runs a mandatory leak-check grep pass over
 * plugin/ and sources/ (plan §11 risk 2: "public-repo information leakage")
 * for internal CIDRs, service-key-shaped values, and bastion hostnames.
 * Packaging ABORTS (no dist/ written) if the deny-list matches anything.
 *
 * No external dependencies — Node built-ins only. ZIPs are written with a
 * small self-contained STORE-method (uncompressed) ZIP writer below, since
 * this box has no system `zip` binary and the task forbids npm deps.
 *
 * Usage: node scripts/package.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync, existsSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(REPO_ROOT, 'dist');
const PLUGIN_DIR = path.join(REPO_ROOT, 'plugin');
const SKILLS_DIR = path.join(PLUGIN_DIR, 'skills');

// ---------------------------------------------------------------------------
// Leak-check deny-list (plan §11 risk 2) — mandatory, runs before any write.
// ---------------------------------------------------------------------------

const DENY_PATTERNS = [
  { name: 'internal 192.168.x.x CIDR', re: /\b192\.168\.\d{1,3}\.\d{1,3}\b/g },
  { name: 'internal 10.0.0.x CIDR', re: /\b10\.0\.0\.\d{1,3}\b/g },
  { name: 'INTERNAL_SERVICE_KEY value', re: /INTERNAL_SERVICE_KEY\s*[:=]\s*['"]?[A-Za-z0-9_-]{8,}/g },
  { name: 'bastion hostname', re: /\baccess01\b/g },
  { name: 'dev-box path leak', re: /\/home\/control\//g },
  { name: 'generic bearer/secret token', re: /\b(?:sk-|Bearer\s+)[A-Za-z0-9_\-.]{16,}/g },
];

function walkFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

function runLeakCheck() {
  const targets = [...walkFiles(PLUGIN_DIR), ...walkFiles(path.join(REPO_ROOT, 'sources')).filter((f) => !f.endsWith('manifest.json'))];
  const hits = [];
  for (const file of targets) {
    let content;
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue; // binary file, skip
    }
    for (const pattern of DENY_PATTERNS) {
      const matches = content.match(pattern.re);
      if (matches) {
        hits.push({ file: path.relative(REPO_ROOT, file), pattern: pattern.name, count: matches.length });
      }
    }
  }
  return hits;
}

// ---------------------------------------------------------------------------
// Minimal pure-JS ZIP writer (STORE method — no compression, no deps).
// Implements just enough of the ZIP file format (local headers + central
// directory + EOCD) to produce an archive any unzip tool can read.
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const time = ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((date.getSeconds() >> 1) & 0x1f);
  const dosDate = (((date.getFullYear() - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0xf) << 5) | (date.getDate() & 0x1f);
  return { time, dosDate };
}

function collectEntries(rootDir, baseArcName) {
  const entries = [];
  for (const absPath of walkFiles(rootDir)) {
    const rel = path.relative(rootDir, absPath).split(path.sep).join('/');
    entries.push({ absPath, arcName: `${baseArcName}/${rel}` });
  }
  return entries;
}

function writeZip(entries, outPath) {
  const { time, dosDate } = dosDateTime();
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;

  for (const { absPath, arcName } of entries) {
    const data = readFileSync(absPath);
    const crc = crc32(data);
    const nameBuf = Buffer.from(arcName, 'utf8');

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(0, 8); // method: stored
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localChunks.push(localHeader, nameBuf, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0, 8); // flags
    centralHeader.writeUInt16LE(0, 10); // method: stored
    centralHeader.writeUInt16LE(time, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra length
    centralHeader.writeUInt16LE(0, 32); // comment length
    centralHeader.writeUInt16LE(0, 34); // disk number start
    centralHeader.writeUInt16LE(0, 36); // internal attrs
    centralHeader.writeUInt32LE(0, 38); // external attrs
    centralHeader.writeUInt32LE(offset, 42); // local header offset

    centralChunks.push(centralHeader, nameBuf);

    offset += localHeader.length + nameBuf.length + data.length;
  }

  const centralDirSize = centralChunks.reduce((n, b) => n + b.length, 0);
  const centralDirOffset = offset;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20);

  const zipBuffer = Buffer.concat([...localChunks, ...centralChunks, eocd]);
  writeFileSync(outPath, zipBuffer);
  return zipBuffer.length;
}

function copyDirRecursive(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(s, d);
    else copyFileSync(s, d);
  }
}

// ---------------------------------------------------------------------------

function main() {
  console.log('quoxpert package — leak-check pass\n');
  const leaks = runLeakCheck();
  if (leaks.length > 0) {
    console.error('ABORTED: potential internal-info leak(s) found in plugin/ or sources/ (excluding manifest.json):\n');
    for (const hit of leaks) console.error(`  ${hit.file}: ${hit.pattern} (${hit.count}x)`);
    console.error('\nRemove/redact before packaging a public release.');
    process.exit(1);
  }
  console.log('  clean — no denied patterns found.\n');

  rmSync(DIST_DIR, { recursive: true, force: true });
  mkdirSync(DIST_DIR, { recursive: true });

  // 1. plugin dir, copied verbatim (this IS the marketplace-install source)
  console.log('Copying plugin/ -> dist/plugin/');
  copyDirRecursive(PLUGIN_DIR, path.join(DIST_DIR, 'plugin'));

  // 2. per-skill ZIPs (channel D — claude.ai / Desktop skill upload)
  const skillZipDir = path.join(DIST_DIR, 'skills');
  mkdirSync(skillZipDir, { recursive: true });
  if (existsSync(SKILLS_DIR)) {
    for (const skillId of readdirSync(SKILLS_DIR)) {
      const skillPath = path.join(SKILLS_DIR, skillId);
      if (!statSync(skillPath).isDirectory()) continue;
      const entries = collectEntries(skillPath, skillId);
      if (entries.length === 0) {
        console.log(`  skipping ${skillId} — no files yet (SKILL.md not authored)`);
        continue;
      }
      const outPath = path.join(skillZipDir, `${skillId}.zip`);
      const size = writeZip(entries, outPath);
      console.log(`  wrote dist/skills/${skillId}.zip (${size} bytes, ${entries.length} file(s))`);
    }
  }

  // 3. whole-plugin ZIP (convenience artifact for release attachments)
  const pluginEntries = collectEntries(PLUGIN_DIR, 'quoxpert-plugin');
  if (pluginEntries.length > 0) {
    const size = writeZip(pluginEntries, path.join(DIST_DIR, 'quoxpert-plugin.zip'));
    console.log(`  wrote dist/quoxpert-plugin.zip (${size} bytes, ${pluginEntries.length} file(s))`);
  }

  // 4. curl installer (channel B)
  const installShSrc = path.join(REPO_ROOT, 'install.sh');
  if (existsSync(installShSrc)) {
    copyFileSync(installShSrc, path.join(DIST_DIR, 'install.sh'));
    console.log('  wrote dist/install.sh');
  }

  console.log('\npackage: done. Artifacts in dist/.');
}

main();
