// Gap cases the test doc lists as "not covered by these ten", plus a few edge cases
// from the M1 plan. Each starts from an approved job and changes one thing.

import { beforeAll, describe, expect, it } from 'vitest';
import { compileRules, determine, selectQuestions, type RuleSet } from '../src/engine';
import { loadRules, readRuleSources } from '../src/rules-dir';
import { applyAnswers, buildFacts, loadJob, summarize, TODAY } from './helpers';

let rules: RuleSet;
beforeAll(() => {
  rules = loadRules();
});

const j01 = loadJob('J-01.yaml');
const j08 = loadJob('J-08.yaml');

/** J-01 after follow-ups, with changes applied to the raw fixture. */
function variant(job = j01, change: (raw: Record<string, any>) => void) {
  const raw = applyAnswers(job.raw, job.answers);
  change(raw);
  return buildFacts(raw);
}

describe('out of scope', () => {
  it('three or more units: stops with SC-01, no packet', () => {
    const d = determine(variant(j01, (r) => (r.property.dwelling_type = 'three_or_more_units')), rules, TODAY);
    expect(d.outcome).toBe('out_of_scope');
    expect(d.flags.map((f) => f.id)).toEqual(['SC-01']);
    expect(d.forms).toEqual([]);
    expect(d.print_blocked).toBe(true);
  });

  it('a town other than Maplewood: stops with SC-02', () => {
    const d = determine(variant(j01, (r) => (r.property.municipality = 'South Orange')), rules, TODAY);
    expect(d.outcome).toBe('out_of_scope');
    expect(d.flags.map((f) => f.id)).toEqual(['SC-02']);
  });

  it('homeowner doing their own trade work: stops with LC-05', () => {
    const d = determine(variant(j01, (r) => (r.performed_by = 'owner')), rules, TODAY);
    expect(d.outcome).toBe('out_of_scope');
    expect(d.flags.map((f) => f.id)).toEqual(['LC-05']);
  });

  it('lead abatement: KB-24 flags "call the office" and stops', () => {
    const d = determine(
      variant(j01, (r) => r.work_items.push({ id: 'lead', kind: 'lead_abatement', label: 'Lead paint abatement' })),
      rules,
      TODAY,
    );
    expect(d.outcome).toBe('out_of_scope');
    expect(d.items.find((i) => i.item_id === 'lead')?.rule_id).toBe('KB-24');
    expect(d.flags.map((f) => f.id)).toEqual(['KB-24']);
    expect(d.print_blocked).toBe(true);
  });
});

describe('licensing and registration', () => {
  it('missing HIC registration: LC-01', () => {
    const facts = variant(j01, () => {});
    facts.team.applicant.hic_registration = null;
    const d = determine(facts, rules, TODAY);
    expect(d.flags.map((f) => f.id)).toEqual(['LC-01']);
  });

  it('no electrician in the directory for an F120 job: LC-02, F120 has no signer', () => {
    const facts = variant(j01, () => {});
    delete facts.team.electrical;
    const d = determine(facts, rules, TODAY);
    expect(d.flags.map((f) => f.id)).toEqual(['LC-02']);
    expect(d.forms.find((f) => f.form === 'F120')?.signer).toBeNull();
  });

  it('J-08 re-run with Clearair clears LC-03 and changes nothing else', () => {
    const northside = determine(j08.after, rules, TODAY);
    const clearair = determine(variant(j08, (r) => (r.team = { hvacr: 'clearair' })), rules, TODAY);
    expect(clearair.flags).toEqual([]);
    expect(clearair.print_blocked).toBe(false);
    const strip = (d: typeof clearair) => ({
      ...summarize(d),
      forms: d.forms.map((f) => f.form),
      flags: [],
      form_entries: d.form_entries,
      questions: d.questions,
    });
    expect(strip(clearair)).toEqual(strip(northside));
    expect(clearair.forms.find((f) => f.form === 'F145')?.signer).toBe('Clearair Mechanical');
  });

  it('a license expiring today is still valid', () => {
    const facts = variant(j08, () => {});
    facts.team.hvacr = { ...facts.team.hvacr!, expires: TODAY };
    expect(determine(facts, rules, TODAY).flags).toEqual([]);
  });
});

describe('structural and conversion work', () => {
  it('bearing wall removal: KB-21, FULL, sealed plans', () => {
    const d = determine(variant(j01, (r) => (r.work_items.find((i: any) => i.id === 'wall').bearing = 'yes')), rules, TODAY);
    const wall = d.items.find((i) => i.item_id === 'wall')!;
    expect([wall.rule_id, wall.tier]).toEqual(['KB-21', 'FULL']);
    expect(wall.assumed_unknown).toEqual([]);
    expect(d.plans?.rule_id).toBe('PL-01');
    expect(d.plans?.requirement).toBe('sealed');
  });

  it('oil-to-gas furnace conversion: HV-02, FULL, gas piping on F130, load-calc flag', () => {
    const facts = buildFacts({
      property: j08.raw.property,
      costs: { total: 12000, electrical: 400, plumbing: 1500 },
      work_items: [
        { id: 'furnace', kind: 'hvac_equipment', label: 'Oil furnace replaced with gas furnace', equipment: 'furnace', action: 'replace', like_capacity: 'yes', fuel_change: 'yes', fuel: 'gas' },
      ],
    });
    const d = determine(facts, rules, TODAY);
    expect(summarize(d).items).toEqual({ furnace: { rule: 'HV-02', tier: 'FULL' } });
    expect(d.forms.map((f) => f.form)).toEqual(['F100', 'F120', 'F130', 'F145']);
    expect(d.plans?.rule_id).toBe('PL-03');
    expect(d.form_entries.F145.heating_system).toEqual({ work: 'Conversion', distribution: 'Hot Air', fuel: 'Gas' });
    expect(d.form_entries.F130.lines).toEqual([{ line: 'Gas piping', count: 1 }]);
    expect(d.form_entries.F100.cost_by_subcode).toEqual({ Electrical: 400, Plumbing: 11600 });
  });
});

describe('"don\'t know" answers take the conservative branch', () => {
  it('bearing unknown: treated as bearing (KB-21) and says so', () => {
    const facts = variant(j01, (r) => (r.work_items.find((i: any) => i.id === 'wall').bearing = 'unknown'));
    const d = determine(facts, rules, TODAY);
    const wall = d.items.find((i) => i.item_id === 'wall')!;
    expect([wall.rule_id, wall.tier]).toEqual(['KB-21', 'FULL']);
    expect(wall.assumed_unknown).toEqual(['bearing']);
    expect(d.plans?.requirement).toBe('sealed');
    expect(d.questions.map((q) => q.key)).toEqual(['wall.bearing']);
  });

  it('window opening unknown: zoning treated as required (ZN-05)', () => {
    const j03 = loadJob('J-03.yaml');
    const facts = variant(j03, (r) => (r.work_items.find((i: any) => i.id === 'window').action = 'unknown'));
    const d = determine(facts, rules, TODAY);
    expect(d.zoning?.status).toBe('required');
    expect(d.zoning?.assumed_unknown).toBe(true);
  });
});

describe('items that match no rule', () => {
  it('is an error, not a skip: the job cannot be classified and printing is blocked', () => {
    const d = determine(
      variant(j01, (r) => r.work_items.push({ id: 'siding', kind: 'siding', label: 'Polypropylene siding', material: 'polypropylene' })),
      rules,
      TODAY,
    );
    expect(d.outcome).toBe('cannot_classify');
    const siding = d.items.find((i) => i.item_id === 'siding')!;
    expect(siding.rule_id).toBeNull();
    expect(siding.error).toMatch(/call the office/i);
    expect(d.print_blocked).toBe(true);
  });
});

describe('question selection', () => {
  it('a count is tested at the rule threshold (5 vs 6), not every number', () => {
    const j05 = loadJob('J-05.yaml');
    const facts = variant(j05, (r) => (r.work_items.find((i: any) => i.id === 'electrical').devices = 'unknown'));
    const keys = selectQuestions(facts, rules, TODAY).map((q) => q.key);
    expect(keys).toContain('electrical.devices');
  });

  it('a count that no rule compares is not asked', () => {
    const j04 = loadJob('J-04.yaml');
    const facts = variant(j04, (r) => (r.work_items.find((i: any) => i.id === 'alarms').count = 'unknown'));
    expect(selectQuestions(facts, rules, TODAY).map((q) => q.key)).toEqual([]);
  });

  it('a missing total cost is asked', () => {
    const facts = variant(j01, (r) => (r.costs.total = null));
    expect(selectQuestions(facts, rules, TODAY).map((q) => q.key)).toEqual(['costs.total']);
  });
});

describe('zoning assumptions are flippable in config, without code changes', () => {
  const flip = (from: string, to: string): RuleSet =>
    compileRules(
      readRuleSources().map((s) => {
        if (s.path !== 'municipal/maplewood/config.yaml') return s;
        if (!s.text.includes(from)) throw new Error(`config has no "${from}"`);
        return { ...s, text: s.text.replace(from, to) };
      }),
    );

  it('A-13: interior alterations require zoning → J-01 needs zoning', () => {
    const flipped = flip('interior_alterations_require_zoning: false', 'interior_alterations_require_zoning: true');
    expect(determine(j01.after, flipped, TODAY).zoning).toMatchObject({ rule_id: 'ZN-01', status: 'required' });
  });

  it('A-15: like-for-like exterior requires zoning → J-08 needs zoning', () => {
    const flipped = flip('exterior_like_for_like_requires_zoning: false', 'exterior_like_for_like_requires_zoning: true');
    expect(determine(j08.after, flipped, TODAY).zoning).toMatchObject({ rule_id: 'ZN-03', status: 'required' });
  });
});
