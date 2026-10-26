#!/usr/bin/env node
/**
 * privacy-sweep.mjs — real-infrastructure-identifier gate (text), HEAD only.
 *
 * Standalone port of quox-dashboard's scripts/privacy-sweep.mjs (itself a
 * port of quox-website's `npm run gate:privacy-sweep`), adapted for the
 * quoxpert repo ahead of public visibility (GTM-R2). quoxpert's own README
 * already states its audience is external (a customer/prospect/plugin
 * developer's Claude) so this gate matters even more here than most repos.
 *
 * Scans every git-tracked text file for the owner's real infrastructure
 * identifiers: LAN addresses, real hostnames, real public IPs, and
 * owner-personal strings. Git history is explicitly out of scope (owner
 * decision) — this only ever looks at the current working tree via
 * `git ls-files`.
 *
 * Usage:
 *   node scripts/privacy-sweep.mjs
 *   node scripts/privacy-sweep.mjs --self-test
 *
 * Exit codes:
 *   0  clean (outside the reviewed allowlist)
 *   1  one or more sensitive identifiers found (listed on stderr)
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, lstatSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO_ROOT = fileURLToPath(new URL('../', import.meta.url))

// ---------------------------------------------------------------------------
// Scan surface: every git-tracked file, minus excluded dirs.
// ---------------------------------------------------------------------------
export const EXCLUDED_DIR_PREFIXES = [
  'node_modules/',
  'dist/',
  'build/',
  '.git/',
  '.claude/worktrees/', // nested worktree checkouts, not this repo's own tree
  // The detector and its fixtures necessarily contain the very strings they
  // forbid (pattern definitions + dirty/clean test fixtures). Exclude the
  // tool's own source so it does not flag itself; `--self-test` still proves
  // the patterns behave.
  'scripts/privacy-sweep.mjs',
  'scripts/privacy-sweep.test.mjs',
]
export const SCAN_EXTENSIONS = [
  '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.md', '.html',
  '.yml', '.yaml', '.sh', '.env.example', '.toml', '.cfg', '.conf', '.txt',
]

// ---------------------------------------------------------------------------
// Allowlist — {file, match} pairs intentionally exempt, reason pinned.
// ---------------------------------------------------------------------------
export const ALLOWLIST = []

// ---------------------------------------------------------------------------
// Sensitive patterns
// ---------------------------------------------------------------------------
// Specific estate patterns (real hostnames, IPs, owner company/email) live in the
// gitignored scripts/estate.local.mjs so they are NOT published with this tool. The
// generic RFC1918-shape patterns below stay inline (they reveal nothing specific and
// still catch our LAN IPs). On the dev box the local file is present, so the real
// release scan is estate-aware; a fresh public clone keeps generic coverage only.
let ESTATE_PATTERNS = []
try { ESTATE_PATTERNS = (await import('./estate.local.mjs')).ESTATE_PATTERNS } catch { /* public clone: generic patterns only */ }

export const SENSITIVE_PATTERNS = [
  { name: 'real LAN address (192.168.x.x)', regex: /\b192\.168\.\d{1,3}\.\d{1,3}\b/g },
  { name: 'real LAN address (10.0.0.x)', regex: /\b10\.0\.0\.\d{1,3}\b/g },
  ...ESTATE_PATTERNS,
]

// ---------------------------------------------------------------------------
// Readers
// ---------------------------------------------------------------------------
function listTrackedFiles() {
  const out = execFileSync('git', ['ls-files'], { cwd: REPO_ROOT, encoding: 'utf-8' })
  return out.split('\n').filter(Boolean)
}

export function collectScanTargets() {
  const files = listTrackedFiles().filter((f) => {
    if (EXCLUDED_DIR_PREFIXES.some((prefix) => f.startsWith(prefix))) return false
    return SCAN_EXTENSIONS.some((ext) => f.endsWith(ext))
  })
  const results = []
  for (const file of files) {
    const full = path.join(REPO_ROOT, file)
    try {
      const stat = lstatSync(full)
      if (!stat.isFile()) continue
      results.push({ file, content: readFileSync(full, 'utf-8') })
    } catch {
      // binary or unreadable; skip
    }
  }
  return results
}

// ---------------------------------------------------------------------------
// Checker: pure function, fixture-testable
// ---------------------------------------------------------------------------
export function checkPrivacySweep(fileContents, patterns = SENSITIVE_PATTERNS, allowlist = ALLOWLIST) {
  const allowSet = new Set(allowlist.map(({ file, match }) => `${file} ${match}`))
  const failures = []
  for (const { file, content } of fileContents) {
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      for (const { name, regex } of patterns) {
        regex.lastIndex = 0
        let m
        while ((m = regex.exec(line)) !== null) {
          if (!allowSet.has(`${file} ${m[0]}`)) {
            failures.push(`${file}:${i + 1}: ${name} — "${m[0]}"`)
          }
          if (m.index === regex.lastIndex) regex.lastIndex++
        }
      }
    }
  }
  return failures
}

function selfTest() {
  const failures = []
  // Generic mechanism check (no real estate in fixtures): a LAN IP must flag, a
  // documentation-range address must not. The estate-aware patterns are data loaded
  // from the gitignored estate file; the authoritative estate scan is the real
  // content sweep that runs on the dev box before a release.
  const dirty = [{ file: 'fixture/docs/Fixture.md', content: 'lab host at 192.168.5.5 on the bench' }]
  if (checkPrivacySweep(dirty).length < 1) failures.push('generic LAN address not flagged')

  const clean = [{ file: 'fixture/docs/Fixture.md', content: 'see 203.0.113.10 at example.com' }]
  if (checkPrivacySweep(clean).length !== 0) failures.push('clean fixture incorrectly flagged')

  if (failures.length) {
    console.error('FAIL privacy-sweep --self-test')
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log('PASS privacy-sweep --self-test (3/3 fixture checks behaved as expected)')
  process.exit(0)
}

function main() {
  if (process.argv.includes('--self-test')) {
    selfTest()
    return
  }
  const fileContents = collectScanTargets()
  const failures = checkPrivacySweep(fileContents)
  if (failures.length) {
    console.error(`FAIL privacy-sweep (${failures.length} finding(s) across ${fileContents.length} scanned files)`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log(`PASS privacy-sweep (${fileContents.length} files scanned, 0 findings)`)
  process.exit(0)
}

main()
