#!/usr/bin/env node
/**
 * scripts/extract-cli-commands.mjs — ground-truth CLI command/flag extractor
 * (QSDK-SKILLS audit fix, 2026-07-25).
 *
 * Why this exists: sources/manifest.json used to point quoxpert-cli's
 * regen inputs at two things that don't actually exist:
 *   1. `node cli/bin/quox.js --help-json` — that flag was never added to the
 *      CLI (the P3 plan item it was waiting on never shipped).
 *   2. A "CLI Commands (QuoxCLI)" section in quox-dashboard/CODEBASE_MAP.md —
 *      that heading doesn't exist in CODEBASE_MAP.md (verified 2026-07-25;
 *      grepping the file for "CLI Commands" / "quoxcli" returns nothing).
 * Both "cli sources" were therefore silently unfetchable — regen.mjs
 * printed a `[warn] could not fetch source ...` and moved on, drift-check.mjs
 * downgraded that to a non-fatal "never regenerated" info line, and nobody
 * noticed the command-map generator was running on zero real input.
 *
 * The fix: parse the actual Commander.js command definitions directly out of
 * cli/lib/commands/*.js. This is the real, currently-shipping source of
 * truth for command names and flags (it's what `quox --help` itself is
 * built from) — more robust than depending on a hand-maintained
 * CODEBASE_MAP.md table staying in sync, and it doesn't require executing
 * the CLI (which needs auth/network to do anything beyond printing help).
 *
 * Parsing approach (deliberately simple, per the audit brief: "a simple
 * extraction of command names and option strings is enough"): each command
 * file registers one Commander.js chain per exported `register*Commands`
 * function. We scan for `.command('name')` call sites in file order and
 * collect the `.description(...)`, `.option(...)`, and `.requiredOption(...)`
 * calls that follow each one, up to the next `.command(` (or end of file).
 * The first `.command()` in a file is treated as that file's top-level
 * group; every other `.command()` in the same file is listed as one of its
 * subcommands. This does not attempt to model deeper nesting (e.g.
 * `config profile add`, `workflow steps set`) — callers that need the exact
 * full path should read the source file directly; this script's job is a
 * deterministic, regeneratable command/flag inventory, not a full commander
 * AST.
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
 * No external dependencies — Node built-ins only.
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

/** Extract every `.command('name')` (and its trailing .description/.option
 *  calls up to the next .command() or EOF) from one command-file's source. */
function parseCommandFile(source) {
  const commandRe = /\.command\(\s*['"]([^'"]+)['"]\s*\)/g;
  const matches = [...source.matchAll(commandRe)];
  if (matches.length === 0) return null;

  const blocks = matches.map((m, i) => {
    const start = m.index;
    const end = i + 1 < matches.length ? matches[i + 1].index : source.length;
    return { name: m[1], text: source.slice(start, end) };
  });

  const descRe = /\.description\(\s*(['"])((?:\\.|(?!\1).)*)\1/;
  const optRe = /\.(option|requiredOption)\(\s*(['"])((?:\\.|(?!\2).)*)\2\s*,\s*(['"])((?:\\.|(?!\4).)*)\4/g;

  const parsed = blocks.map((b) => {
    const descMatch = b.text.match(descRe);
    const description = descMatch ? descMatch[2] : '';
    const options = [...b.text.matchAll(optRe)].map((om) => ({
      flag: om[3],
      desc: om[5],
      required: om[1] === 'requiredOption',
    }));
    return { name: b.name, description, options };
  });

  const [group, ...subcommands] = parsed;
  return { group: group.name, description: group.description, subcommands };
}

function toTable(groups) {
  const lines = ['| Command | Purpose |', '|---|---|'];
  for (const g of groups) {
    const subNames = g.subcommands.map((s) => s.name).join(', ') || '(no subcommands)';
    const purpose = g.description ? `${g.description} — ${subNames}` : subNames;
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
    const parsed = parseCommandFile(source);
    if (parsed) groups.push(parsed);
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

main();
