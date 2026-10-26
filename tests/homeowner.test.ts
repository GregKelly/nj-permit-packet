// Homeowner trade work (rules table §4.7): the unit cases and variants listed in
// docs/test-jobs-v1.md, "Homeowner unit cases", J-12b and J-13a. Each starts from
// an approved job and changes one thing.

import { beforeAll, describe, expect, it } from 'vitest';
import { compileRules, determine, selectQuestions, type Determinations, type RuleSet } from '../src/engine';
import { loadRules, readRuleSources } from '../src/rules-dir';
import { applyAnswers, buildFacts, loadJob, summarize, TODAY } from './helpers';

let rules: RuleSet;
beforeAll(() => {
  rules = loadRules();
});

const j08 = loadJob('J-08.yaml');
const j09 = loadJob('J-09.yaml');
const j11 = loadJob('J-11.yaml');
const j12 = loadJob('J-12.yaml');
const j13 = loadJob('J-13.yaml');

/** A job after follow-ups, with changes applied to the raw fixture. */
function variant(job: ReturnType<typeof loadJob>, change: (raw: Record<string, any>) => void) {
  const raw = applyAnswers(job.raw, job.answers);
  change(raw);
  return buildFacts(raw);
}

/** Rules with one text replacement in the homeowner rule file (for the A-23 / A-26 switches). */
function flip(from: string, to: string): RuleSet {
  return compileRules(
    readRuleSources().map((s) => {
      if (s.path !== 'state/nj/homeowner.yaml') return s;
      if (!s.text.includes(from)) throw new Error(`homeowner.yaml has no "${from}"`);
      return { ...s, text: s.text.replace(from, to) };
    }),
  );
}

const flag = (d: Determinations, id: string) => d.flags.find((f) => f.id === id);
const EXEMPT_HIC = 'Exempt: owner, N.J.A.C. 5:23-2.15(b)8.ii';
const HIC_SHORT = ['Exempt: owner, 5:23-2.15(b)8.ii', 'Exempt: owner'];

/** J-13 with only the furnace (no condenser), owner doing the HVACR and wiring. */
const furnaceOnly = (change: (raw: Record<string, any>) => void = () => {}) =>
  variant(j13, (r) => {
    r.work_items = r.work_items.filter((i: any) => i.id !== 'condenser');
    change(r);
  });

describe('approved messages', () => {
  it('J-12: HO-02 says why plumbing is blocked and what to do', () => {
    const d = determine(j12.after, rules, TODAY);
    expect(flag(d, 'HO-02')).toEqual({
      id: 'HO-02',
      message: 'NJ plumbing law lets only a single-family homeowner do their own plumbing. Assign a licensed master plumber.',
      blocks_printing: true,
    });
  });

  it('J-13: HO-04 names the refrigerant item', () => {
    const d = determine(j13.after, rules, TODAY);
    expect(flag(d, 'HO-04')?.message).toBe(
      "Work on the A/C condensing unit involves refrigerant, which the owner can't do under the homeowner exemption. Assign a licensed HVACR contractor for all the HVACR work.",
    );
    expect(d.print_blocked).toBe(true);
  });

  it('J-11: the owner checklist lines HO-T1 and HO-T2', () => {
    const d = determine(j11.after, rules, TODAY);
    expect(d.owner_notes).toEqual([
      { id: 'HO-T1', text: "You must do the electrical work yourself. Under the homeowner exemption, friends, relatives or a handyman can't do it for you." },
      {
        id: 'HO-T2',
        text: 'The estimated cost for your electrical work is the figure given ($2,000). Ask the construction office whether to include the value of your own labor.',
      },
    ]);
  });

  it('J-11: the owner signs F100 in the Owner Section and F120 as exempt applicant', () => {
    const d = determine(j11.after, rules, TODAY);
    expect(d.forms.filter((f) => f.by_owner).map((f) => f.form)).toEqual(['F100', 'F120']);
    expect(d.owner_trades).toEqual([{ trade: 'electrical', allowed: true, rule_id: null }]);
    expect(d.assumptions_applied.map((a) => a.id)).toEqual(expect.arrayContaining(['A-25', 'A-27']));
  });
});

describe('1-3. who lives in the home (HO-01)', () => {
  it("1. the owner doesn't live there: HO-01 blocks electrical", () => {
    const d = determine(variant(j11, (r) => (r.property.owner_occupied = 'no')), rules, TODAY);
    expect(d.flags).toEqual([
      { id: 'HO-01', message: 'The owner can do their own electrical work only in a home they live in. Assign a licensed electrician.', blocks_printing: true },
    ]);
    expect(d.print_blocked).toBe(true);
    expect(d.forms.find((f) => f.form === 'F120')?.signer).toBeNull();
  });

  it('2. only immediate family lives there: electrical passes', () => {
    const d = determine(variant(j11, (r) => (r.property.owner_occupied = 'immediate_family')), rules, TODAY);
    expect(d.flags).toEqual([]);
    expect(d.forms.find((f) => f.form === 'F120')?.signer).toBe('Owner');
  });

  it('2. only immediate family lives there: plumbing is blocked (HO-01)', () => {
    const d = determine(
      variant(j11, (r) => {
        r.property.owner_occupied = 'immediate_family';
        r.performed_by = { electrical: 'owner', plumbing: 'owner' };
      }),
      rules,
      TODAY,
    );
    expect(d.flags).toEqual([
      { id: 'HO-01', message: 'The owner can do their own plumbing work only in a home they live in. Assign a licensed master plumber.', blocks_printing: true },
    ]);
    expect(summarize(d).forms).toMatchObject({ F120: 'Owner', F130: null });
  });

  it('2. only immediate family lives there: HVACR is blocked (HO-01), wiring passes', () => {
    const d = determine(furnaceOnly((r) => (r.property.owner_occupied = 'immediate_family')), rules, TODAY);
    expect(d.flags.map((f) => f.id)).toEqual(['HO-01']);
    expect(d.flags[0].message).toContain('HVACR');
    expect(summarize(d).forms).toMatchObject({ F120: 'Owner', F145: null, F370: null });
  });

  it('3. "don\'t know": treated as not living there, says so, and the question is asked', () => {
    const facts = variant(j11, (r) => (r.property.owner_occupied = 'unknown'));
    const d = determine(facts, rules, TODAY);
    expect(d.flags.map((f) => f.id)).toEqual(['HO-01']);
    expect(d.flags[0].message).toMatch(/because it wasn't known/);
    expect(d.print_blocked).toBe(true);
    expect(selectQuestions(facts, rules, TODAY).map((q) => q.key)).toEqual(['property.owner_occupied']);
  });

  it('occupancy is not asked when the owner does no trade work', () => {
    expect(selectQuestions(loadJob('J-01.yaml').before, rules, TODAY).map((q) => q.key)).toEqual([]);
  });
});

describe('4. attached home, owner does plumbing (HO-02)', () => {
  const attached = (own_sewer?: string) =>
    variant(j11, (r) => {
      r.property.dwelling_type = 'attached';
      if (own_sewer) r.property.own_sewer = own_sewer;
      r.performed_by = { electrical: 'owner', plumbing: 'owner' };
    });

  it('own sewer: passes; F130 is the owner, exempt, with the plumbing citation', () => {
    const d = determine(attached('yes'), rules, TODAY);
    expect(d.flags).toEqual([]);
    expect(d.forms.find((f) => f.form === 'F130')).toMatchObject({ signer: 'Owner', by_owner: true });
    expect(d.form_entries.F130.exempt_applicant).toEqual({ license: 'Exempt: homeowner, N.J.S.A. 45:14C-12.4', hic: EXEMPT_HIC, hic_short: HIC_SHORT });
    expect(d.form_entries.F100.owner_section).toEqual(['C', 'C.3', 'C.4', 'D']);
  });

  it('shared sewer: HO-02 blocks, saying the sewer is shared', () => {
    const d = determine(attached('no'), rules, TODAY);
    expect(d.flags.map((f) => f.id)).toEqual(['HO-02']);
    expect(d.flags[0].message).toContain('shares a sewer line with the neighbor');
    expect(d.flags[0].message).toContain('Assign a licensed master plumber.');
  });

  it("don't know: HO-02 blocks, and the question is asked", () => {
    const facts = attached();
    const d = determine(facts, rules, TODAY);
    expect(d.flags.map((f) => f.id)).toEqual(['HO-02']);
    expect(d.flags[0].message).toMatch(/because it wasn't known/);
    expect(selectQuestions(facts, rules, TODAY).map((q) => q.key)).toEqual(['property.own_sewer']);
  });

  it('the sewer question is asked only for an attached home where the owner does plumbing', () => {
    const detached = variant(j11, (r) => (r.performed_by = { electrical: 'owner', plumbing: 'owner' }));
    expect(selectQuestions(detached, rules, TODAY).map((q) => q.key)).toEqual([]);
    const attachedSubPlumbs = variant(j11, (r) => (r.property.dwelling_type = 'attached'));
    expect(selectQuestions(attachedSubPlumbs, rules, TODAY).map((q) => q.key)).toEqual([]);
  });
});

describe('5. owner replaces only the furnace on a detached home', () => {
  const facts = () =>
    variant(j08, (r) => {
      r.team = {};
      r.work_items = r.work_items.filter((i: any) => i.id === 'furnace');
      r.property.owner_occupied = 'yes';
      r.performed_by = { mechanical: 'owner' };
      r.costs = { electrical: 300, mechanical: 5000 };
    });

  it('passes; F145 and F370 are signed by the owner; Watts keeps F120', () => {
    const d = determine(facts(), rules, TODAY);
    expect(d.flags).toEqual([]);
    expect(summarize(d).forms).toEqual({ F100: 'Owner', F120: 'Watts Electric LLC', F145: 'Owner', F370: 'Owner' });
    expect(d.form_entries.F145.exempt_applicant).toEqual({ license: 'Exempt: homeowner, N.J.S.A. 45:16A-9', hic: EXEMPT_HIC, hic_short: HIC_SHORT });
    expect(d.form_entries.F370.exempt_applicant).toBeUndefined();
  });

  it('no C.3/C.4 on F100 for HVACR; Q-13 is shown', () => {
    const d = determine(facts(), rules, TODAY);
    expect(d.form_entries.F100.owner_section).toEqual(['C', 'D']);
    expect(d.form_entries.F100.cost_by_subcode).toEqual({ Electrical: 300, Plumbing: 5000 });
    expect(d.office_questions.map((q) => q.id)).toContain('Q-13');
  });
});

describe('6. owner installs a mini-split (HV-03)', () => {
  it('HO-04 blocks: refrigerant work', () => {
    const d = determine(
      variant(j09, (r) => {
        r.property.owner_occupied = 'yes';
        r.performed_by = { mechanical: 'owner' };
        r.costs = { electrical: 900, mechanical: 15100 };
      }),
      rules,
      TODAY,
    );
    expect(d.flags.map((f) => f.id)).toEqual(['HO-04']);
    expect(d.flags[0].message).toMatch(/^Work on the mini-split involves refrigerant/);
  });
});

describe('7. the owner does building work', () => {
  it('the narrowed LC-05 still stops', () => {
    const d = determine(variant(j11, (r) => (r.performed_by = { building: 'owner' })), rules, TODAY);
    expect(d.outcome).toBe('out_of_scope');
    expect(d.flags).toEqual([{ id: 'LC-05', message: "Out of scope: the owner doing building work themselves isn't supported.", blocks_printing: true }]);
  });
});

describe('8. two-family home, owner does HVACR (HO-03, A-26)', () => {
  const twoFamily = () => furnaceOnly((r) => (r.property.dwelling_type = 'detached_2f'));

  it('HO-03 blocks', () => {
    const d = determine(twoFamily(), rules, TODAY);
    expect(d.flags).toEqual([
      { id: 'HO-03', message: 'NJ HVACR law lets only a single-family homeowner do their own HVACR work. Assign a licensed HVACR contractor.', blocks_printing: true },
    ]);
  });

  it('with A-26 flipped, it passes', () => {
    const flipped = flip('two_family_owner_plumbing_hvacr: false', 'two_family_owner_plumbing_hvacr: true');
    const d = determine(twoFamily(), flipped, TODAY);
    expect(d.flags).toEqual([]);
    expect(summarize(d).forms).toMatchObject({ F145: 'Owner', F370: 'Owner' });
  });
});

describe('J-12b: J-12 as written, with A-26 flipped', () => {
  it('HO-02 passes; F130 becomes owner, exempt; F100 adds C.4', () => {
    const flipped = flip('two_family_owner_plumbing_hvacr: false', 'two_family_owner_plumbing_hvacr: true');
    const d = determine(j12.after, flipped, TODAY);
    expect(d.flags).toEqual([]);
    expect(d.print_blocked).toBe(false);
    expect(summarize(d).forms).toEqual({ F100: 'Owner', F110: 'Hollis Building Co. LLC', F120: 'Owner', F130: 'Owner' });
    expect(d.form_entries.F130).toEqual({
      use_group: 'R-5',
      est_cost: 1200,
      exempt_applicant: { license: 'Exempt: homeowner, N.J.S.A. 45:14C-12.4', hic: EXEMPT_HIC, hic_short: HIC_SHORT },
      lines: [
        { line: 'Water closet', count: 1 },
        { line: 'Lavatory', count: 1 },
      ],
    });
    expect(d.form_entries.F100.owner_section).toEqual(['C', 'C.3', 'C.4', 'D']);
    expect(d.form_entries.F100.cost_by_subcode).toEqual({ Building: 28000, Electrical: 1500, Plumbing: 1200 });
    expect(d.form_entries.F100.total_cost).toBe(30700);
  });
});

describe('A-23 is a switch too', () => {
  it('turned off, a two-family owner may not do their own electrical (HO-06)', () => {
    const flipped = flip('two_family_owner_electrical: true', 'two_family_owner_electrical: false');
    const d = determine(loadJob('J-12a.yaml').after, flipped, TODAY);
    expect(d.flags.map((f) => f.id)).toEqual(['HO-06']);
    expect(d.flags[0].message).toContain('Assign a licensed electrician.');
  });
});

describe('J-13a: Clearair takes the condenser only; the owner keeps the furnace', () => {
  it('HO-04 clears, but HO-05 blocks: one signer per section', () => {
    const d = determine(variant(j13, (r) => (r.performed_by = { electrical: 'owner', mechanical: { owner: ['furnace'] } })), rules, TODAY);
    expect(d.flags).toEqual([
      {
        id: 'HO-05',
        message: 'One person must do and sign for all the HVACR work on this permit. Assign either the owner or Clearair Mechanical to all of it.',
        blocks_printing: true,
      },
    ]);
    expect(summarize(d).forms).toMatchObject({ F120: 'Owner', F145: null, F370: null });
  });

  it("an item the job doesn't have can't be assigned to the owner", () => {
    expect(() => variant(j13, (r) => (r.performed_by = { mechanical: { owner: ['boiler'] } }))).toThrow(/boiler/);
  });
});

describe('licensing checks skip the trades the owner does', () => {
  it('no electrician in the directory: no LC-02 when the owner does the electrical', () => {
    const facts = variant(j11, () => {});
    delete facts.team.electrical;
    expect(determine(facts, rules, TODAY).flags).toEqual([]);
  });

  it('an expired HVACR license: no LC-03 when the owner does the HVACR', () => {
    const d = determine(furnaceOnly((r) => (r.team = { hvacr: 'northside' })), rules, TODAY);
    expect(d.flags).toEqual([]);
  });
});
