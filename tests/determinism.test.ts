// Same input → same output (CLAUDE.md, design doc §2).

import { describe, expect, it } from 'vitest';
import { determine } from '../src/engine';
import { loadRules } from '../src/rules-dir';
import { loadJobs, TODAY } from './helpers';

describe('determinism', () => {
  for (const job of loadJobs()) {
    it(`${job.id}: two runs with separately loaded rules are byte-identical`, () => {
      const a = JSON.stringify(determine(job.before, loadRules(), TODAY));
      const b = JSON.stringify(determine(job.before, loadRules(), TODAY));
      expect(a).toBe(b);
      expect(JSON.stringify(determine(job.after, loadRules(), TODAY))).toBe(JSON.stringify(determine(job.after, loadRules(), TODAY)));
    });
  }
});
