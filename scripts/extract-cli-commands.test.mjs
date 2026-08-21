// fleet #371 — the quoxpert-cli command-map generator flattened every
// .command() in a file into one comma list regardless of real nesting,
// making `governance policy pending-approvals` indistinguishable from a
// (nonexistent) top-level `governance pending-approvals`. Fixing the
// extractor properly (58 of 59 command files use multi-level grouping)
// surfaced two more real bugs along the way, both covered below.
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseCommandFile, toTable } from './extract-cli-commands.mjs';

describe('parseCommandFile', () => {
  test('flat file (single group, no nested subgroups) — baseline, unchanged behavior', () => {
    const src = `
      const doctor = program
        .command('doctor')
        .description('Run platform health diagnostics');
    `;
    const groups = parseCommandFile(src);
    assert.strictEqual(groups.length, 1);
    assert.strictEqual(groups[0].group, 'doctor');
    assert.strictEqual(groups[0].subcommands.length, 0);
  });

  test('multi-level nesting: governance-shaped file resolves full paths, not a flat dump', () => {
    const src = `
      const governance = program
        .command('governance')
        .description('Governance');

      const policy = governance
        .command('policy')
        .description('Manage policies');

      policy
        .command('list')
        .description('List policies');

      policy
        .command('pending-approvals')
        .description('List pending approvals');

      const approval = governance
        .command('approval')
        .description('Second-approver sign-off');

      approval
        .command('resolve')
        .description('Approve or reject');
    `;
    const groups = parseCommandFile(src);
    assert.strictEqual(groups.length, 1);
    const names = groups[0].subcommands.map((s) => s.path.slice(1).join(' '));
    assert.deepStrictEqual(names, ['policy list', 'policy pending-approvals', 'approval resolve']);
    // The intermediate group nodes ('policy', 'approval') must NOT appear
    // standalone — they're not a complete, runnable command on their own.
    assert.ok(!names.includes('policy'));
    assert.ok(!names.includes('approval'));
  });

  test('auth.js-shaped file: multiple independent top-level commands in one file', () => {
    const src = `
      program
        .command('login')
        .description('Authenticate with QuoxCORE');

      program
        .command('logout')
        .description('End current session');

      const mfa = program
        .command('mfa')
        .description('Manage multi-factor authentication');

      mfa
        .command('setup')
        .description('Enable MFA');
    `;
    const groups = parseCommandFile(src);
    // login and logout must be their OWN top-level rows, not smooshed into
    // each other or silently dropped to an empty subcommand name.
    assert.strictEqual(groups.length, 3);
    const byName = Object.fromEntries(groups.map((g) => [g.group, g]));
    assert.ok(byName.login);
    assert.strictEqual(byName.login.subcommands.length, 0);
    assert.ok(byName.logout);
    assert.strictEqual(byName.logout.subcommands.length, 0);
    assert.ok(byName.mfa);
    assert.strictEqual(byName.mfa.subcommands.map((s) => s.path.slice(1).join(' '))[0], 'setup');
  });

  test('empty source (no .command() calls) returns an empty array, not null', () => {
    assert.deepStrictEqual(parseCommandFile('const x = 1;'), []);
  });
});

describe('toTable', () => {
  test('never renders an empty subcommand name (the login/logout/whoami/signup regression)', () => {
    const src = `
      program.command('login').description('Auth');
      program.command('logout').description('End session');
    `;
    const table = toTable(parseCommandFile(src));
    assert.ok(!table.includes(', ,'), `table contained an empty entry:\n${table}`);
    assert.ok(!/\|\s*,/.test(table), `table contained a leading empty entry:\n${table}`);
  });

  test('renders "(no subcommands)" for a leaf-only group', () => {
    const src = `program.command('status').description('Show status');`;
    const table = toTable(parseCommandFile(src));
    assert.match(table, /\(no subcommands\)/);
  });
});

// fleet #432: the extractor only ever walked cli/lib/commands, so any
// command registered directly on `program` in cli/bin/quox.js was structurally
// invisible to the command map. `quox tui` and `quox completion` had therefore
// NEVER been documented: not stale, unreachable. These lock down that the
// entrypoint's own registrations parse like any other file, so --entry can
// carry them.
describe('entrypoint-registered commands (fleet #432)', () => {
  test('parses commands chained straight off program in the entrypoint', () => {
    const src = `
      program
        .command('tui')
        .description('Launch interactive TUI')
        .action(async () => {});

      program
        .command('completion <shell>')
        .description('Generate shell completions (bash, zsh, fish)')
        .action(() => {});
    `;
    const groups = parseCommandFile(src);
    const names = groups.map((g) => g.group);
    assert.ok(names.includes('tui'), `expected tui, got ${names.join(', ')}`);
    assert.ok(names.includes('completion <shell>'), `expected completion, got ${names.join(', ')}`);
  });

  test('entrypoint commands render as normal leaf rows', () => {
    const src = `program.command('tui').description('Launch interactive TUI');`;
    const table = toTable(parseCommandFile(src));
    assert.match(table, /\| `quox tui` \| Launch interactive TUI: \(no subcommands\) \|/);
  });

  test('an entrypoint with no commands contributes nothing rather than throwing', () => {
    assert.deepStrictEqual(parseCommandFile('import { Command } from "commander";'), []);
  });
});
