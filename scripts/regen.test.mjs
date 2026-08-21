// fleet #432: regen rewrote generated blocks but never touched
// `generated_at`, while drift-check.mjs reads that field and reports on it.
// The pack's only freshness signal was therefore hand-maintained, and it lied
// in both directions: 12 skills read 2026-07-25 long after their sources
// moved, and a hand-bump without a regen would have made a stale skill look
// current. These lock down that the stamp moves with the content, and only
// with the content.
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { bumpGeneratedAt } from './regen.mjs';

const SKILL = `---
name: quoxpert-cli
metadata:
  quoxpert:
    source_repo: quox-dashboard (cli/)
    generated_at: 2026-07-25
    quox_version: ">=0.1 pre-1.0"
---

# Body

Some prose that happens to mention generated_at: 2026-01-01 in passing.
`;

describe('bumpGeneratedAt', () => {
  test('rewrites the frontmatter stamp to the given date', () => {
    const out = bumpGeneratedAt(SKILL, '2026-08-21');
    assert.match(out, /^ {4}generated_at: 2026-08-21$/m);
    assert.ok(!out.includes('generated_at: 2026-07-25'), 'old stamp survived');
  });

  test('preserves the original indentation', () => {
    const out = bumpGeneratedAt(SKILL, '2026-08-21');
    assert.ok(out.includes('\n    generated_at: 2026-08-21\n'), `indentation lost:\n${out}`);
  });

  test('does not touch a generated_at mentioned in the body', () => {
    const out = bumpGeneratedAt(SKILL, '2026-08-21');
    assert.match(out, /prose that happens to mention generated_at: 2026-01-01/);
  });

  test('leaves a skill that never carried the stamp alone (does not invent one)', () => {
    const noStamp = '---\nname: quoxpert\ndescription: x\n---\n\n# Body\n';
    assert.strictEqual(bumpGeneratedAt(noStamp, '2026-08-21'), noStamp);
  });

  test('is a no-op on content without frontmatter', () => {
    const plain = '# Just a heading\n\ngenerated_at: 2026-07-25\n';
    assert.strictEqual(bumpGeneratedAt(plain, '2026-08-21'), plain);
  });

  test('rewrites only the first stamp when frontmatter somehow has two', () => {
    const dup = '---\na:\n  generated_at: 2026-07-25\nb:\n  generated_at: 2026-07-25\n---\nbody\n';
    const out = bumpGeneratedAt(dup, '2026-08-21');
    assert.strictEqual((out.match(/generated_at: 2026-08-21/g) || []).length, 1);
    assert.strictEqual((out.match(/generated_at: 2026-07-25/g) || []).length, 1);
  });

  test('defaults to today in ISO form when no date is passed', () => {
    const out = bumpGeneratedAt(SKILL);
    assert.match(out, /^ {4}generated_at: \d{4}-\d{2}-\d{2}$/m);
  });
});
