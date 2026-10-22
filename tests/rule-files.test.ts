// Rule file checks: every file is valid, every approved rule ID exists, and the
// checker rejects the mistakes an editor is likely to make.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compileRules } from '../src/engine';
import { readRuleSources } from '../src/rules-dir';

const TABLE = readFileSync(new URL('../docs/rules-table-v1.md', import.meta.url), 'utf8');

/** IDs defined in the approved table (first column of a row), excluding the deferred fee appendix. */
function approvedIds(): string[] {
  const body = TABLE.split('## Appendix A')[0];
  const rows = [...body.matchAll(/^\| ((?:KB|FB|RF|HV|ZN|PL|CQ|LC|TP|A)-\d+) \|/gm)].map((m) => m[1]);
  const questions = [...body.matchAll(/^- \*\*(Q-\d+)\./gm)].map((m) => m[1]);
  return [...new Set([...rows, ...questions])];
}

/** Compile the real rule files with one text replacement in one file. */
function compileWith(path: string, from: string, to: string) {
  const sources = readRuleSources().map((s) => {
    if (s.path !== path) return s;
    if (!s.text.includes(from)) throw new Error(`${path} has no "${from}"`);
    return { ...s, text: s.text.replace(from, to) };
  });
  return () => compileRules(sources);
}

describe('rule files', () => {
  it('all load and pass the checker', () => {
    expect(() => compileRules(readRuleSources())).not.toThrow();
  });

  it('contain every ID in the approved rules table', () => {
    const ids = approvedIds();
    expect(ids.length).toBeGreaterThan(100);
    const defined = compileRules(readRuleSources()).ids;
    expect(ids.filter((id) => !defined.has(id))).toEqual([]);
  });

  it('have a stable version hash that changes when a rule changes', () => {
    const a = compileRules(readRuleSources()).version;
    expect(compileRules(readRuleSources()).version).toBe(a);
    const b = compileWith('state/nj/kitchen-bath.yaml', 'title: Replace or install flooring', 'title: Replace or install floors')();
    expect(b.version).not.toBe(a);
  });
});

describe('the rule checker rejects', () => {
  const KB = 'state/nj/kitchen-bath.yaml';

  it('a duplicate rule ID', () => {
    expect(compileWith(KB, 'id: KB-02', 'id: KB-01')).toThrow(/duplicate id KB-01/i);
  });

  it('a reference to an assumption that does not exist', () => {
    expect(compileWith(KB, 'assumptions: [A-3]', 'assumptions: [A-99]')).toThrow(/A-99/);
  });

  it('a condition on a fact the work item kind does not have', () => {
    expect(compileWith(KB, 'bearing: "no"', 'bearring: "no"')).toThrow(/bearring/);
  });

  it('a condition value the fact cannot take', () => {
    expect(compileWith(KB, 'element: flooring', 'element: floorin')).toThrow(/floorin/);
  });

  it('a rule for a work item kind that does not exist', () => {
    expect(compileWith(KB, 'kind: gas_line', 'kind: gas_lines')).toThrow(/gas_lines/);
  });

  it('a form that is not defined', () => {
    expect(compileWith(KB, 'forms: [F110]', 'forms: [F111]')).toThrow(/F111/);
  });

  it('a rule file missing from the manifest', () => {
    const sources = [...readRuleSources(), { path: 'state/nj/extra.yaml', text: 'type: tips\nrules: []\n' }];
    expect(() => compileRules(sources)).toThrow(/manifest/i);
  });
});
