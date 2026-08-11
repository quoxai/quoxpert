#!/usr/bin/env node
/**
 * scripts/extract-cli-commands.mjs: ground-truth CLI command/flag extractor
 * (QSDK-SKILLS audit fix, 2026-07-25).
 *
 * Why this exists: sources/manifest.json used to point quoxpert-cli's
 * regen inputs at two things that don't actually exist:
 *   1. `node cli/bin/quox.js --help-json`, a flag that was never added to the
 *      CLI (the P3 plan item it was waiting on never shipped).
 *   2. A "CLI Commands (QuoxCLI)" section in quox-dashboard/CODEBASE_MAP.md:
 *      that heading doesn't exist in CODEBASE_MAP.md (verified 2026-07-25;
 *      grepping the file for "CLI Commands" / "quoxcli" returns nothing).
 * Both "cli sources" were therefore silently unfetchable: regen.mjs
 * printed a `[warn] could not fetch source ...` and moved on, drift-check.mjs
 * downgraded that to a non-fatal "never regenerated" info line, and nobody
 * noticed the command-map generator was running on zero real input.
 *
 * The fix: parse the actual Commander.js command definitions directly out of
 * cli/lib/commands/*.js. This is the real, currently-shipping source of
 * truth for command names and flags (it's what `quox --help` itself is
 * built from), more robust than depending on a hand-maintained
 * CODEBASE_MAP.md table staying in sync, and it doesn't require executing
 * the CLI (which needs auth/network to do anything beyond printing help).
 *
 * Parsing approach: each command file registers one Commander.js chain per
 * exported `register*Commands` function. We scan for `<ident>.command('name')`
 * call sites in file order — capturing the identifier the call chains off
 * of — and collect the `.description(...)`, `.option(...)`, and
 * `.requiredOption(...)` calls that follow each one, up to the next
 * `.command(` (or end of file).
 *
 * fleet #371 (2026-08-11): originally this treated every `.command()` in a
 * file as a flat sibling of the file's top-level group, regardless of real
 * nesting — e.g. governance.js's `policy`, `template`, `approval`, `ward`,
 * `cert` are themselves subcommand GROUPS with their own children
 * (`const policy = governance.command('policy')`, then
 * `policy.command('list')`, `policy.command('pending-approvals')`, ...), but
 * the flattener dumped every name from every depth into one comma list —
 * `policy, list, get, pending-approvals, create, ...` — with no way to tell
 * `pending-approvals` nests under `policy` (the real command is `governance
 * policy pending-approvals`) rather than being a sibling of `policy` itself.
 * 58 of the 59 files under cli/lib/commands use this multi-level
 * `const child = parent.command(...)` grouping pattern, so this wasn't a
 * governance-specific bug.
 *
 * Now: track which identifier each `.command()` call chains off of, resolve
 * multi-level nesting through `const X = Y.command(...)` assignments, and
 * render each LEAF command (one nothing else nests under) as its full path
 * relative to its top-level group — `policy list`, `policy
 * pending-approvals`, `approval resolve`, etc. Intermediate group nodes
 * (`policy`, `ward`, ...) are not rendered standalone since they're not a
 * complete, runnable command on their own.
 *
 * One more wrinkle caught during the #371 fix itself, not just theorized:
 * a single file can register MULTIPLE independent top-level `quox X`
 * commands chained straight off `program`, not just one group followed by
 * its descendants — auth.js registers `login`, `logout`, `whoami`,
 * `signup`, and `mfa` (a real group with setup/verify/disable/backup-codes
 * children) as five separate top-level commands, all in one file. Treating
 * "the file's first command" as the sole group and blindly stripping
 * everyone else's leading path segment produced `quox login | ..., , ,
 * setup, verify, ...` — three silently empty subcommand names for
 * logout/whoami/signup, which have nothing to strip because they're not
 * nested under `login` at all. Fixed by grouping ALL entries chained
 * directly off `program` as their own top-level rows, not just the first.
 *
 * Usage:
 *   node extract-cli-commands.mjs [commandsDir] [--format=table|json]
 *   commandsDir defaults to 'cli/lib/commands' relative to cwd (this script
 *   is invoked by regen.mjs with cwd set to the quox-dashboard checkout).
 *   --format=table (default) prints a `| Command | Purpose |` markdown
 *   table compatible with regen.mjs's existing 'command-map' generator.
 *   --format=json prints the full { group, description, subcommands: [{
 *   name, description, options: [{ flag, desc, required }] }] }[] structure,
 *   for future flag-table generator work.
 *
 * No external dependencies: Node built-ins only.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  let commandsDir = 'cli/lib/commands';
  let format = 'table';
  for (const arg of argv) {
    if (arg.startsWith('--format=')) format = arg.slice('--format='.length);
    else if (!arg.startsWith('--')) commandsDir = arg;
  }
  return { commandsDir, format };
}

/** Extract every `<ident>.command('name')` (and its trailing .description/
 *  .option calls up to the next .command() or EOF) from one command-file's
 *  source, resolving multi-level nesting through `const X = Y.command(...)`
 *  assignments (fleet #371). Returns an ARRAY of top-level `quox X` command
 *  groups — a file can register more than one (see auth.js: login, logout,
 *  whoami, signup, mfa are five independent top-level commands, not one
 *  group with the other four as children). */
function parseCommandFile(source) {
  // Captures an optional `const NEWVAR = ` binding, the base identifier the
  // chain continues from, and the command name — in file order. `\s*`
  // between BASE and `.command(` covers both same-line chains
  // (`program.command('x')`) and the multi-line style used throughout this
  // codebase (`program\n    .command('x')`).
  const commandRe = /(?:const\s+(\w+)\s*=\s*)?(\w+)\s*\.command\(\s*['"]([^'"]+)['"]\s*\)/g;
  const matches = [...source.matchAll(commandRe)];
  if (matches.length === 0) return [];

  const blocks = matches.map((m, i) => {
    const start = m.index;
    const end = i + 1 < matches.length ? matches[i + 1].index : source.length;
    return { newVar: m[1] || null, baseVar: m[2], name: m[3], text: source.slice(start, end) };
  });

  const descRe = /\.description\(\s*(['"])((?:\\.|(?!\1).)*)\1/;
  const optRe = /\.(option|requiredOption)\(\s*(['"])((?:\\.|(?!\2).)*)\2\s*,\s*(['"])((?:\\.|(?!\4).)*)\4/g;

  // varToPath: identifier -> array of command-name segments from its
  // top-level command down to (and including) that identifier's own
  // command. 'program' seeded as the root (empty path — every entry
  // chained directly off it starts a NEW top-level command, per the
  // auth.js wrinkle above).
  const varToPath = new Map([['program', []]]);
  const usedAsBase = new Set();

  const parsed = blocks.map((b) => {
    const descMatch = b.text.match(descRe);
    const description = descMatch ? descMatch[2] : '';
    const options = [...b.text.matchAll(optRe)].map((om) => ({
      flag: om[3],
      desc: om[5],
      required: om[1] === 'requiredOption',
    }));
    const basePath = varToPath.get(b.baseVar) ?? [];
    if (varToPath.has(b.baseVar)) usedAsBase.add(b.baseVar);
    const path = [...basePath, b.name];
    if (b.newVar) varToPath.set(b.newVar, path);
    return { name: b.name, description, options, path, newVar: b.newVar };
  });

  // Every entry chained directly off `program` (path.length === 1) is its
  // own top-level command group. Everything else nests under exactly one
  // of those (path[0] === that group's name).
  const roots = parsed.filter((n) => n.path.length === 1);
  return roots.map((root) => {
    const descendants = parsed.filter((n) => n !== root && n.path[0] === root.name);
    // A node is an intermediate group (not directly listed) only if
    // something else in this file chains off its own const binding — a
    // group command with no children (e.g. `quox doctor`) still renders
    // as a leaf.
    const subcommands = descendants.filter((n) => !(n.newVar && usedAsBase.has(n.newVar)));
    return { group: root.name, description: root.description, subcommands };
  });
}

function toTable(groups) {
  const lines = ['| Command | Purpose |', '|---|---|'];
  for (const g of groups) {
    // path includes the top-level group name itself at index 0 — drop it,
    // the row is already keyed by `quox <group>`.
    const subNames = g.subcommands.map((s) => s.path.slice(1).join(' ')).join(', ') || '(no subcommands)';
    const purpose = g.description ? `${g.description}: ${subNames}` : subNames;
    lines.push(`| \`quox ${g.group}\` | ${purpose} |`);
  }
  return lines.join('\n');
}

function main() {
  const { commandsDir, format } = parseArgs(process.argv.slice(2));
  const dirEntries = readdirSync(commandsDir).filter((f) => {
    if (!f.endsWith('.js')) return false;
    if (f.endsWith('.test.js')) return false;
    if (f === 'helpers.js') return false;
    return statSync(path.join(commandsDir, f)).isFile();
  });
  dirEntries.sort();

  const groups = [];
  for (const file of dirEntries) {
    const source = readFileSync(path.join(commandsDir, file), 'utf8');
    groups.push(...parseCommandFile(source));
  }

  if (groups.length === 0) {
    console.error(`extract-cli-commands: no command groups found under ${commandsDir}`);
    process.exit(1);
  }

  if (format === 'json') {
    console.log(JSON.stringify(groups, null, 2));
  } else {
    console.log(toTable(groups));
  }
}

// Entry-point guard so this is importable for tests (fleet #371) without
// main() trying to readdirSync a commandsDir relative to the test's cwd.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { parseCommandFile, toTable };
