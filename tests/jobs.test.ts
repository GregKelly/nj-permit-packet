// The approved test jobs (docs/test-jobs-v1.md), checked exactly.

import { beforeAll, describe, expect, it } from 'vitest';
import { determine, selectQuestions, type Determinations, type RuleSet } from '../src/engine';
import { loadRules } from '../src/rules-dir';
import { loadJobs, summarize, TODAY } from './helpers';

let rules: RuleSet;
beforeAll(() => {
  rules = loadRules();
});

for (const job of loadJobs()) {
  describe(`${job.id} · ${job.title}`, () => {
    let d: Determinations;
    beforeAll(() => {
      d = determine(job.after, rules, TODAY);
    });
    const e = job.expected;

    it('asks exactly the expected follow-up questions (before follow-ups)', () => {
      const asked = selectQuestions(job.before, rules, TODAY).map((q) => q.key);
      expect([...asked].sort()).toEqual([...job.expected_questions].sort());
    });

    it('has nothing left to ask after the follow-ups', () => {
      expect(d.questions.map((q) => q.key)).toEqual([]);
    });

    it('outcome and job tier', () => {
      const s = summarize(d);
      expect({ outcome: s.outcome, job_tier: s.job_tier }).toEqual({ outcome: e.outcome, job_tier: e.job_tier });
    });

    it('rule and tier for each work item', () => {
      expect(summarize(d).items).toEqual(e.items);
    });

    it('forms and signers', () => {
      expect(summarize(d).forms).toEqual(e.forms);
    });

    it('zoning', () => {
      expect(summarize(d).zoning).toEqual(e.zoning);
    });

    it('plans', () => {
      expect(summarize(d).plans).toEqual(e.plans);
    });

    it('tips', () => {
      expect(summarize(d).tips).toEqual(e.tips);
    });

    it('flags', () => {
      expect(summarize(d).flags).toEqual(e.flags);
      expect(d.print_blocked).toBe(e.print_blocked ?? false);
    });

    it('form entries (work type, cost, quantities; fee boxes blank)', () => {
      expect(d.form_entries).toEqual(e.form_entries);
    });

    it('cover checklist: details left for subs to fill in', () => {
      expect(d.fill_ins).toEqual(e.fill_ins);
    });

    it('cover checklist: lines for an owner doing their own trade work (HO-T1, HO-T2)', () => {
      expect(d.owner_notes.map((n) => n.id)).toEqual(e.owner_notes ?? []);
    });

    if (e.office_questions_include) {
      it('shows the open questions for the office', () => {
        const ids = d.office_questions.map((q) => q.id);
        for (const q of e.office_questions_include) expect(ids).toContain(q);
      });
    }
  });
}
