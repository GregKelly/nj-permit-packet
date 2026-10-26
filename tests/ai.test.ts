// The AI layer, offline (M3 plan, "Tests"). The API is never called here:
// answers are hand-made or replayed from saved recordings.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { beforeAll, describe, expect, it } from 'vitest';
import { determine, parseJobFacts, selectQuestions, type RuleSet } from '../src/engine';
import { WORK_ITEM_KINDS, PROPERTY_FACTS } from '../src/engine/facts';
import { loadRules } from '../src/rules-dir';
import { checkExtract, checkQuestions, checkScope, dollarAmounts } from '../src/ai/checks';
import { outputSchema } from '../src/ai/client';
import { extract, extractRequest, matchDirectory, toFacts, type DirectoryEntry } from '../src/ai/extract';
import { applyAnswers, openQuestions } from '../src/ai/flow';
import { fallbackQuestion, phraseQuestions, questionsRequest } from '../src/ai/questions';
import { replayTransport, loadRecording } from '../src/ai/replay';
import { ExtractOutput, QuestionsOutput, ScopeOutput } from '../src/ai/schema';
import { scopeRequest, writeScope } from '../src/ai/scope';
import { answerKeyAsOutput, jobFromExtraction } from '../src/ai/eval/jobs';
import { alignItems, playRounds, renameItems, scoreFacts } from '../src/ai/eval/score';
import { buildFacts, loadJob, loadJobs, profile, TODAY } from './helpers';

let rules: RuleSet;
beforeAll(() => {
  rules = loadRules();
});

const directory: DirectoryEntry[] = Object.entries(profile.subcontractors).map(([key, s]) => ({ key, name: s.name, trade: s.trade }));
const j01 = loadJob('J-01.yaml');
const j03 = loadJob('J-03.yaml');
const jobsWithDescriptions = loadJobs().filter((j) => !j.raw.variant_of);

/** A valid extraction to break in the check tests: J-03's answer key. */
const j03Output = () => ExtractOutput.parse(answerKeyAsOutput(j03.raw, directory));

describe('extract checks catch bad answers', () => {
  it('a perfect answer passes', () => {
    expect(checkExtract(j03Output(), j03.raw.description)).toEqual([]);
  });

  it('an invented cost', () => {
    const out = j03Output();
    out.costs.plumbing = 6000; // the description gives only the $32k budget
    expect(checkExtract(out, j03.raw.description)).toEqual([expect.stringContaining('costs.plumbing is 6000')]);
  });

  it('a range turned into a number', () => {
    const text = 'Reroof 8 Baker St. Somewhere around $14–16k depending on what we find.';
    expect(dollarAmounts(text)).toEqual([14]);
    const out = ExtractOutput.parse({ ...j03Output(), costs: { total: 15000, building: null, electrical: null, plumbing: null, mechanical: null } });
    expect(checkExtract(out, text).some((p) => p.includes('costs.total is 15000'))).toBe(true);
  });

  it('amounts written several ways are read correctly', () => {
    expect(dollarAmounts('$48,000; $32k; HVAC $1.5k; $ 600')).toEqual([48000, 32000, 1500, 600]);
  });

  it('a made-up quote', () => {
    const out = j03Output();
    out.quotes = [{ key: 'window.action', quote: 'make the window opening wider' }];
    expect(checkExtract(out, j03.raw.description)).toEqual([expect.stringContaining("isn't word for word")]);
  });

  it('a real quote passes, even across a line break in the description', () => {
    const out = j03Output();
    out.quotes = [{ key: 'window.action', quote: 'Owner wants a bigger window over the tub area' }];
    expect(checkExtract(out, j03.raw.description)).toEqual([]);
  });

  it('a quote for a fact that has a value', () => {
    const out = j03Output();
    out.quotes = [{ key: 'lavs.action', quote: 'Double vanity' }];
    expect(checkExtract(out, j03.raw.description)).toEqual([expect.stringContaining('quotes are only for unknown facts')]);
  });

  it('duplicate item ids and owner items that do not exist', () => {
    const out = j03Output();
    (out.work_items[1] as { id: string }).id = 'shower';
    out.performed_by.plumbing = { who: 'owner', name: null, owner_item_ids: ['tub'] };
    const problems = checkExtract(out, j03.raw.description);
    expect(problems).toContain('Two work items have the id "shower".');
    expect(problems).toContain('performed_by.plumbing: no work item "tub".');
  });
});

describe('question checks catch bad answers', () => {
  const asked = () => selectQuestions(j03.before, rules, TODAY);
  const good = () => ({ questions: asked().map((q) => fallbackQuestion(q, j03.before)) });

  it('the built-in wording passes its own checks', () => {
    expect(checkQuestions(good(), asked())).toEqual([]);
  });

  it('a missing question, an extra one, and a changed answer value', () => {
    const out = good();
    const dropped = out.questions.pop()!;
    out.questions.push({ key: 'floor_tile.element', text: 'What tile?', options: [] });
    out.questions[0].options[0].value = 'moved';
    const problems = checkQuestions(out, asked());
    expect(problems).toEqual([
      'Question shower.action must offer exactly these answer values: replace_same, add, relocate, unknown.',
      "Question floor_tile.element wasn't asked for; write questions only for the keys given.",
      `No question for ${dropped.key}.`,
    ]);
  });

  it('a cost question that allows a range or doesn\'t say an estimate is fine', () => {
    const out = good();
    const cost = out.questions.find((q) => q.key === 'costs.plumbing')!;
    cost.text = 'Roughly what range is the plumbing work?';
    expect(checkQuestions(out, asked())).toEqual([expect.stringContaining('costs.plumbing asks for a cost')]);
  });
});

describe('scope checks catch bad answers', () => {
  const d = () => determine(j01.after, rules, TODAY);
  const ok = () =>
    ScopeOutput.parse({
      sections: [
        { trade: 'building', sentences: [{ text: 'Remove the non-bearing wall between the kitchen and dining room.', item_ids: ['wall'] }, { text: 'New drywall throughout.', item_ids: ['drywall'] }] },
        { trade: 'electrical', sentences: [{ text: 'Two new 20A counter circuits, 8 recessed cans and island outlets: 18 devices.', item_ids: ['electrical'] }] },
        { trade: 'plumbing', sentences: [{ text: 'Move the sink to the new island, with a dishwasher and disposal.', item_ids: ['island'] }] },
      ],
    });

  it('a grounded narrative passes', () => {
    expect(checkScope(ok(), j01.after, d())).toEqual([]);
  });

  it('an invented number, a missing permitted item, a made-up item and a code citation', () => {
    const out = ok();
    out.sections[1].sentences[0].text = 'Install 20 devices on a new 200A panel per N.J.A.C. 5:23-2.17A.';
    out.sections[2].sentences = [{ text: 'Plumbing per plan.', item_ids: ['sink_move'] }];
    const problems = checkScope(out, j01.after, d());
    expect(problems).toContain('The sentence "Install 20 devices on a new 200A panel per N.J.A.C. 5:23-2.17A." has the number 200, which isn\'t in the confirmed facts.');
    expect(problems.some((p) => p.includes('names a code section'))).toBe(true);
    expect(problems.some((p) => p.includes('"sink_move", which doesn\'t exist'))).toBe(true);
    expect(problems.some((p) => p.includes('Permitted work item "island"'))).toBe(true);
  });
});

describe('the output formats sent to the API', () => {
  it('keep the allowed values (enum) and drop keywords the API rejects', () => {
    for (const schema of [ExtractOutput, QuestionsOutput, ScopeOutput]) {
      const json = JSON.stringify(outputSchema(schema));
      expect(json).not.toMatch(/"(\$schema|minimum|maximum)"/);
    }
    expect(JSON.stringify(outputSchema(ExtractOutput))).toContain('"enum":["replace_same","new","enlarge","unknown"]');
  });

  it('the extraction prompt explains every item kind and fact in the schema', () => {
    const prompt = readFileSync(new URL('../src/ai/prompts/extract.md', import.meta.url), 'utf8');
    for (const [kind, facts] of Object.entries(WORK_ITEM_KINDS)) {
      expect(prompt, kind).toContain(`\`${kind}\``);
      for (const fact of Object.keys(facts)) expect(prompt, `${kind}.${fact}`).toContain(`\`${fact}\``);
    }
    for (const fact of ['dwelling_type', 'owner_occupied', 'own_sewer']) expect(prompt).toContain(`\`${fact}\``);
  });
});

describe('nothing private is sent', () => {
  const secrets = [profile.applicant.name, profile.applicant.fein!, profile.applicant.hic_registration!, profile.applicant.phone!, profile.applicant.email!];
  for (const s of Object.values(profile.subcontractors)) secrets.push(s.name, s.license, s.phone!, s.email!);

  it('extract sends only the description', () => {
    const req = extractRequest(j01.raw.description);
    for (const s of secrets) expect(req.user + req.system).not.toContain(s);
  });

  it('questions and scope send work items and costs only', () => {
    const asked = selectQuestions(j03.before, rules, TODAY);
    const q = questionsRequest(asked, j03.before, {});
    const s = scopeRequest(j01.after, determine(j01.after, rules, TODAY));
    for (const text of [q.user, s.user]) {
      for (const secret of [...secrets, j01.raw.property.address, j03.raw.property.address]) expect(text).not.toContain(secret);
    }
  });
});

describe('fallbacks: the job can go ahead without the AI', () => {
  it('built-in wording exists for every fact the engine can ask about', () => {
    const questions = [
      ...Object.entries(WORK_ITEM_KINDS).flatMap(([kind, facts]) =>
        Object.entries(facts)
          .filter(([, spec]) => spec.type === 'choice' || spec.type === 'count')
          .map(([fact, spec]) => ({ key: `x.${fact}`, item_id: 'x', fact, options: spec.type === 'choice' ? [...spec.values] : [], kind })),
      ),
      ...Object.keys(PROPERTY_FACTS).map((fact) => ({ key: `property.${fact}`, fact, options: ['yes', 'no'] })),
      ...['total', 'building', 'electrical', 'plumbing', 'mechanical'].map((fact) => ({ key: `costs.${fact}`, fact, options: [] })),
    ];
    const facts = { ...j01.before, work_items: [{ id: 'x', kind: 'fixture', label: 'Test item' }] };
    for (const q of questions) {
      const w = fallbackQuestion(q, facts);
      expect(checkQuestions({ questions: [w] }, [q]), q.key).toEqual([]);
    }
  });

  it('with no key or network, questions fall back to the built-in wording', async () => {
    const asked = selectQuestions(j03.before, rules, TODAY);
    const r = await phraseQuestions(asked, j03.before, {}, { transport: replayTransport({}) });
    expect(r.fallback).toBe(true);
    expect(r.questions.map((q) => q.key)).toEqual(asked.map((q) => q.key));
  });

  it('with no key or network, the scope is empty and the packet keeps the plain list', async () => {
    const r = await writeScope(j01.after, determine(j01.after, rules, TODAY), { transport: replayTransport({}) });
    expect(r.paragraphs).toEqual([]);
    expect(r.problems).toEqual(['No saved answer for the scope call.']);
  });
});

describe('a failed check gets one retry with the problems listed', () => {
  it('extract: a bad first answer, then a good one', async () => {
    const bad = j03Output();
    bad.costs.plumbing = 6000;
    const answers = [bad, j03Output()];
    const seen: string[] = [];
    const r = await extract(j03.raw.description, {
      transport: async (req) => {
        seen.push(req.user);
        return { output: answers.shift(), usage: { model: 'test', input_tokens: 0, output_tokens: 0, cost: 0 } } as never;
      },
    });
    expect(r.problems).toEqual([]);
    expect(r.attempts).toBe(2);
    expect(seen[1]).toContain('costs.plumbing is 6000');
  });
});

describe('names in the description are matched to the directory by plain code', () => {
  it.each([
    ['Northside', 'mechanical', 'northside'],
    ['Sutton Plumbing', 'plumbing', 'sutton'],
    ['Clearair', 'mechanical', 'clearair'],
    ["the homeowner's brother-in-law", 'electrical', null],
    ['Watts', 'plumbing', null], // right name, wrong trade
  ])('%s (%s) → %s', (name, trade, key) => {
    expect(matchDirectory(name, trade, directory)).toBe(key);
  });
});

describe('the eval scores a perfect extraction perfectly (checks the eval itself)', () => {
  for (const job of jobsWithDescriptions) {
    it(job.id, () => {
      const ex = toFacts(answerKeyAsOutput(job.raw, directory), directory);
      const raw = jobFromExtraction(job.raw, ex);
      const facts = buildFacts(raw);
      const matches = alignItems(facts.work_items, job.before.work_items);
      const score = scoreFacts(facts, job.before, matches, raw, job.raw);
      expect(score).toEqual({ guessed: [], wrong: [], missed: [], extra_items: [], missing_items: [] });
      const renamed = renameItems(raw, matches);
      expect(selectQuestions(buildFacts(renamed), rules, TODAY).map((q) => q.key).sort()).toEqual([...job.expected_questions].sort());
      const r = playRounds(renamed, job.after, determine(job.after, rules, TODAY), buildFacts, rules, TODAY);
      expect(r.differences).toEqual([]);
    });
  }
});

describe('the eval tells guessed, wrong and missed facts apart', () => {
  it('J-03 with a guessed window, a wrong lavatory count and a missed total', () => {
    const out = j03Output();
    const items = out.work_items as Record<string, unknown>[];
    items.find((i) => i.id === 'window')!.action = 'replace_same';
    items.find((i) => i.id === 'lavs')!.fixtures = [{ fixture: 'lavatory', count: 1 }];
    out.costs.total = null;
    const ex = toFacts(out, directory);
    const raw = jobFromExtraction(j03.raw, ex);
    const facts = buildFacts(raw);
    const score = scoreFacts(facts, j03.before, alignItems(facts.work_items, j03.before.work_items), raw, j03.raw);
    expect(score.guessed).toEqual([{ key: 'window.action', expected: 'unknown', got: 'replace_same' }]);
    expect(score.wrong).toEqual([{ key: 'lavs.fixtures', expected: { lavatory: 2 }, got: { lavatory: 1 } }]);
    expect(score.missed).toEqual([{ key: 'costs.total', expected: 32000, got: null }]);
  });

  it('items the AI split or named differently are matched by kind and facts', () => {
    const ai = [
      { id: 'a', kind: 'finishes', label: 'Quartz counters', element: 'countertops' },
      { id: 'b', kind: 'finishes', label: 'Cabinets', element: 'cabinets' },
      { id: 'c', kind: 'gutters', label: 'Gutters' },
    ];
    const gold = j01.before.work_items;
    const m = alignItems(ai, gold);
    expect(m).toContainEqual({ gold: 'counters', ai: 'a', kind: 'finishes' });
    expect(m).toContainEqual({ gold: 'cabinets', ai: 'b', kind: 'finishes' });
    expect(m).toContainEqual({ gold: null, ai: 'c', kind: 'gutters' });
    expect(m).toContainEqual({ gold: 'wall', ai: null, kind: 'wall_change' });
  });
});

describe('follow-up rounds (plan, changes 3 to 5)', () => {
  // E-04 as a perfect extraction would give it.
  const e04 = () => ({
    property: { municipality: 'Maplewood', address: '45 Jefferson Ave', prop_class: '2', year_built: 1930, dwelling_type: 'detached_1f' },
    costs: { total: 26000, electrical: 3800 },
    work_items: [
      { id: 'toilet_vanity', kind: 'fixture', label: 'New toilet and vanity in the same places', fixtures: { water_closet: 1, lavatory: 1 }, action: 'replace_same' },
      { id: 'tile', kind: 'finishes', label: 'New tile', element: 'wall_tile' },
      { id: 'fan', kind: 'exhaust_fan', label: 'New fan' },
      { id: 'elec', kind: 'electrical', label: 'The usual electrical' },
    ],
  });

  function run(answers: Record<string, unknown>) {
    let raw: Record<string, any> = e04();
    const declined = new Set<string>();
    const rounds: string[][] = [];
    for (;;) {
      const asked = openQuestions(buildFacts(raw), rules, TODAY, declined);
      if (!asked.length) break;
      rounds.push(asked.map((q) => q.key));
      const next = applyAnswers(raw, Object.fromEntries(asked.map((q) => [q.key, answers[q.key] ?? 'unknown'])));
      raw = next.raw;
      next.declined.forEach((k) => declined.add(k));
    }
    return { rounds, d: determine(buildFacts(raw), rules, TODAY) };
  }

  it('an answer can open a new question: whether there is a new circuit comes in round 2', () => {
    const { rounds, d } = run({ 'elec.action': 'add', 'elec.new_circuit': 'none', 'elec.devices': 4, 'fan.cuts_framing': 'no' });
    expect(rounds[0]).toEqual(['fan.cuts_framing', 'elec.action', 'elec.devices']);
    expect(rounds[1]).toEqual(['elec.new_circuit']);
    expect(rounds).toHaveLength(2);
    expect(d.form_entries.F120.lines).toEqual([{ line: 'Devices', count: 4 }]);
  });

  it('with a new circuit, the device count is still asked (change 4)', () => {
    const { rounds, d } = run({ 'elec.action': 'add', 'elec.new_circuit': 'other', 'elec.devices': 7, 'fan.cuts_framing': 'no' });
    expect(rounds.flat()).toContain('elec.devices');
    expect(d.form_entries.F120.lines).toEqual([{ line: 'Devices', count: 7 }]);
  });

  it('"Don\'t know" ends the questions; no applicant box is blank without a note (change 5)', () => {
    const { d } = run({ 'elec.action': 'add', 'elec.new_circuit': 'other', 'fan.cuts_framing': 'no' });
    expect(d.questions.map((q) => q.key)).toContain('elec.devices'); // still unknown, but declined
    expect(d.form_entries.F120.lines).toEqual([{ line: 'Devices', count: null }]);
    expect(d.fill_ins).toContainEqual({ form: 'F120', signer: 'Watts Electric LLC', details: ['Devices count'] });
  });
});

describe('saved API answers still go through to the right result', () => {
  const dir = new URL('./ai/recordings/', import.meta.url).pathname;
  const saved = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.extract.json')) : [];
  it.skipIf(saved.length > 0)('no recordings yet (run `npm run eval -- --record` with an API key)', () => {});
  for (const file of saved) {
    const id = file.replace('.extract.json', '');
    if (!id.startsWith('J-')) continue;
    it(`${id}: the saved extraction fits the format and passes its checks`, async () => {
      const job = loadJob(`${id}.yaml`);
      const r = await extract(job.raw.description, { transport: replayTransport({ extract: loadRecording(dir + file) }) });
      expect(r.problems).toEqual([]);
      parseJobFacts(buildFacts(jobFromExtraction(job.raw, toFacts(r.output!, directory))));
    });
  }
});

describe('eval-only fixtures', () => {
  const dir = new URL('./ai/eval-jobs/', import.meta.url).pathname;
  it('all ten approved descriptions are there, with the approved wording', () => {
    const doc = readFileSync(new URL('../docs/eval-jobs-m3.md', import.meta.url), 'utf8').replace(/\s+/g, ' ');
    const files = readdirSync(dir).filter((f) => /^E-\d+\.yaml$/.test(f));
    expect(files).toHaveLength(10);
    for (const f of files) {
      const spec = parse(readFileSync(dir + f, 'utf8'));
      expect(doc, spec.id).toContain(`> ${spec.description.trim()}`.replace(/\s+/g, ' '));
    }
  });
});
