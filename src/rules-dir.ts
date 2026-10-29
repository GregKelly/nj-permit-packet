// Reads the rule files from disk. Kept outside src/engine so the engine stays free of I/O.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { compileRules, type RuleSet, type RuleSource } from './engine';
import { projectPath } from './paths';

export const RULES_DIR = projectPath('rules');

export function readRuleSources(dir = RULES_DIR): RuleSource[] {
  const out: RuleSource[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d).sort()) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.yaml')) out.push({ path: relative(dir, full).split(sep).join('/'), text: readFileSync(full, 'utf8') });
    }
  };
  walk(dir);
  return out;
}

export function loadRules(dir = RULES_DIR): RuleSet {
  return compileRules(readRuleSources(dir));
}
