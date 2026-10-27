// The app's job service (M4 plan, "Tests"). Offline: AI answers are replayed
// from tests/ai/recordings/, and the clock is the test date.

import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import { beforeAll, describe, expect, it } from 'vitest';
import { AiError, type AiRequest, type Transport } from '../src/ai/client';
import { alignItems, renameKey, resultOf } from '../src/ai/eval/score';
import { loadRecording, replayTransport, type Recording } from '../src/ai/replay';
import { Store } from '../src/db';
import { compileRules, determine, UNKNOWN, type JobFacts, type RuleSet } from '../src/engine';
import { Jobs, JobError, type JobView } from '../src/jobs/service';
import type { NewJob } from '../src/jobs/types';
import { formValues } from '../src/packet/entries';
import { loadRules, readRuleSources } from '../src/rules-dir';
import { applyAnswers, loadJob, profile, TODAY, type JobFixture } from './helpers';
import { loadPacketJob, packetProfile, PACKET_JOBS, pageTexts } from './packet-helpers';

let rules: RuleSet;
beforeAll(() => {
  rules = loadRules();
});

const RECORDINGS = new URL('./ai/recordings/', import.meta.url).pathname;
const PACKETS = new URL('./packets/', import.meta.url).pathname;

/** A store holding the shared test profile; returns it and the directory ids by profile key ("watts" → 1). */
function testStore(path = ':memory:') {
  const store = new Store(path);
  store.saveProfile(profile.applicant);
  const ids: Record<string, number> = {};
  for (const [key, sub] of Object.entries(profile.subcontractors)) {
    ids[key] = store.saveSub({ ...sub, usual: profile.default_team[sub.trade] === key });
  }
  return { store, ids };
}

const noAi: Transport = async () => {
  throw new AiError('No Claude API key. Set ANTHROPIC_API_KEY.', 'no_key');
};

function jobs(store: Store, transport: Transport = noAi, ruleSet = () => rules) {
  return new Jobs({ store, rules: ruleSet, today: () => TODAY, ai: { transport } });
}

/** A test job as typed on the Describe screen: its site and owner from tests/packets/, its home type from the fixture. */
function describeScreen(fx: JobFixture): NewJob {
  const file = `${PACKETS}${fx.id}.yaml`;
  const packet = existsSync(file) ? parse(readFileSync(file, 'utf8'), { merge: true }) : null;
  const p = fx.raw.property;
  return {
    site: {
      street: p.address,
      municipality: p.municipality,
      zip: packet?.site.zip ?? '07040',
      block: packet?.site.block ?? '100',
      lot: packet?.site.lot ?? '1',
      ...(packet?.site.qualifier ? { qualifier: packet.site.qualifier } : {}),
      prop_class: p.prop_class,
      year_built: p.year_built ?? null,
      dwelling_units: null,
    },
    home_type: p.dwelling_type,
    owner: packet?.owner ?? { name: 'Test Owner', address: { street: p.address, city: 'Maplewood', state: 'NJ', zip: '07040' } },
    description: fx.raw.description ?? `Variant of ${fx.raw.variant_of}`,
  };
}

/** The saved AI answers for one test job. */
function recordings(id: string): Partial<Record<'extract' | 'questions' | 'scope', Recording>> {
  const out: Partial<Record<'extract' | 'questions' | 'scope', Recording>> = {};
  for (const call of ['extract', 'questions', 'scope'] as const) {
    const file = `${RECORDINGS}${id}.${call}.json`;
    if (existsSync(file)) out[call] = loadRecording(file);
  }
  return out;
}

/** The approved answer for a question, by the answer key's own ids. An item the key doesn't have: "Don't know". */
function approvedAnswer(key: string, after: JobFacts): unknown {
  const [head, fact] = key.split('.');
  if (head === 'costs') return (after.costs as Record<string, unknown>)[fact];
  if (head === 'property') return (after.property as Record<string, unknown>)[fact];
  const item = after.work_items.find((i) => i.id === head);
  return item ? item[fact] : UNKNOWN;
}

/** The fixture's team picks ("northside", or null for none) as directory ids, over the usual subs. */
function teamIds(fx: JobFixture, ids: Record<string, number>) {
  const out: Record<string, number | null> = {};
  for (const [trade, key] of Object.entries((fx.raw.team ?? {}) as Record<string, string | null>)) out[trade] = key === null ? null : ids[key];
  return out;
}

/** Manual path: no AI; the contractor enters the fixture's facts before follow-ups, then answers the approved questions. */
async function enterByHand(fx: JobFixture) {
  const { store, ids } = testStore();
  const app = jobs(store);
  let v = await app.create(describeScreen(fx));
  const { work_items, costs = {}, performed_by = {}, property } = fx.raw;
  const { municipality: _m, address: _a, prop_class: _c, year_built: _y, dwelling_type: _d, ...asked } = property;
  v = app.edit(v.id, { raw: { work_items, costs, performed_by, property: asked }, team: { ...v.job.team, ...teamIds(fx, ids) } });
  const firstRound = v.questions.map((q) => q.key).sort();
  if (v.questions.length) v = await app.answer(v.id, Object.fromEntries(v.questions.map((q) => [q.key, fx.answers[q.key]])));
  // Approved answers that aren't questions (J-03's fuller label) are edits on the Review screen.
  const edits = Object.fromEntries(Object.entries(fx.answers).filter(([k]) => !firstRound.includes(k)));
  if (Object.keys(edits).length) v = app.edit(v.id, { raw: applyAnswers(v.job.raw, edits) as typeof v.job.raw });
  return { store, app, v, firstRound };
}

const withDescription = () =>
  readdirSync(new URL('./jobs/', import.meta.url).pathname)
    .filter((f) => /^J-.*\.yaml$/.test(f))
    .map((f) => loadJob(f))
    .filter((j) => !j.raw.variant_of)
    .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));

// ── 1. The app gives the same answer as the commands ──────────────────────────

describe('through the app with the saved AI answers, every test job ends with its approved result', () => {
  for (const fx of withDescription()) {
    it(fx.id, async () => {
      const { store } = testStore();
      const app = jobs(store, replayTransport(recordings(fx.id)));
      let v = await app.create(describeScreen(fx));
      expect(v.job.ai_note).toBeNull();
      expect(v.names).toEqual([]);
      const matches = alignItems(v.facts.work_items, fx.before.work_items);
      expect(v.questions.map((q) => renameKey(q.key, matches)).sort()).toEqual([...fx.expected_questions].sort());
      for (let round = 0; round < 5 && v.questions.length; round++) {
        v = await app.answer(v.id, Object.fromEntries(v.questions.map((q) => [q.key, approvedAnswer(renameKey(q.key, matches), fx.after)])));
      }
      expect(v.questions).toEqual([]);

      const got = resultOf(v.d);
      const want = resultOf(determine(fx.after, rules, TODAY));
      got.items = Object.fromEntries(
        Object.entries(got.items)
          .map(([id, r]) => [matches.find((m) => m.ai === id)?.gold, r] as const)
          .filter(([id]) => id)
          .sort(([a], [b]) => String(a).localeCompare(String(b))),
      );
      expect(got).toEqual(want);
    });
  }
});

describe('entered by hand (no AI), every packet job prints the same form entries as the approved packet', () => {
  for (const id of PACKET_JOBS) {
    it(id, async () => {
      const fx = loadJob(`${id}.yaml`);
      const { store, app, v: answered, firstRound } = await enterByHand(fx);
      expect(firstRound).toEqual([...fx.expected_questions].sort());
      expect(answered.stage).toBe('review');
      app.confirm(answered.id);
      app.approveScope(answered.id, null);
      const v = app.view(answered.id);
      expect(v.stage).toBe('print');
      const printed = await app.packet(v.id);
      expect(printed.kind).toBe('packet');

      const f = loadPacketJob(id, rules);
      expect(resultOf(v.d)).toEqual(resultOf(f.d));
      expect(formValues(app.packetJob(v), v.d, store.packetProfile())).toEqual(formValues(f.job, f.d, packetProfile));
    });
  }

  for (const id of ['J-02', 'J-06']) {
    it(`${id}: the "no permit needed" sheet, with no scope step`, async () => {
      const { app, v } = await enterByHand(loadJob(`${id}.yaml`));
      app.confirm(v.id);
      expect(app.view(v.id).needs_scope).toBe(false);
      expect((await app.packet(v.id)).kind).toBe('no_permit');
    });
  }
});

describe('the manual path', () => {
  it('with no API key, the job is saved with a plain note and no work items, ready to fill in by hand', async () => {
    const { store } = testStore();
    const v = await jobs(store).create(describeScreen(loadJob('J-01.yaml')));
    expect(v.job.ai_note).toMatch(/No Claude API key/);
    expect(v.facts.work_items).toEqual([]);
    expect(v.blockers).toContain('Add at least one work item.');
  });

  it('with no API key, follow-up questions use the built-in wording', async () => {
    const { v } = await enterByHand(loadJob('J-03.yaml'));
    expect(v.stage).toBe('review'); // J-03's approved questions were asked and answered
    const fx = loadJob('J-03.yaml');
    const { store } = testStore();
    const app = jobs(store);
    const fresh = await app.create(describeScreen(fx));
    const { municipality: _m, address: _a, prop_class: _c, year_built: _y, dwelling_type: _d, ...asked } = fx.raw.property;
    const edited = app.edit(fresh.id, { raw: { work_items: fx.raw.work_items, costs: fx.raw.costs ?? {}, performed_by: {}, property: asked } });
    expect(edited.questions.length).toBeGreaterThan(0);
    for (const q of edited.questions) expect(q.text.length).toBeGreaterThan(0);
  });
});

// ── 4. Saved data ─────────────────────────────────────────────────────────────

describe('saved data', () => {
  it('the profile and directory come back unchanged, and give the packet builder the test profile', () => {
    const { store } = testStore();
    expect(store.getProfile()).toEqual(profile.applicant);
    const byLicense = (a: { license: string }, b: { license: string }) => a.license.localeCompare(b.license);
    expect(store.packetProfile().subcontractors.sort(byLicense)).toEqual([...packetProfile.subcontractors].sort(byLicense));
    expect(store.packetProfile().applicant).toEqual(packetProfile.applicant);
  });

  it('one usual sub per trade: marking another unmarks the first', () => {
    const { store, ids } = testStore();
    store.saveSub({ ...store.getSub(ids.northside)!, usual: true });
    const usual = store.listSubs().filter((s) => s.trade === 'hvacr' && s.usual);
    expect(usual.map((s) => s.id)).toEqual([ids.northside]);
  });

  it('a job reopened from the file is the same job, and printing it again gives the same PDF', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'pp-')), 'app.db');
    const fx = loadJob('J-01.yaml');
    const { app, v } = await enterByHand(fx);
    app.confirm(v.id);
    app.approveScope(v.id, null);
    const first = (await app.packet(v.id)).pdf;

    // The same steps against a file, then the file opened again.
    const { store: onDisk, ids } = testStore(file);
    const app1 = jobs(onDisk);
    const created = await app1.create(describeScreen(fx));
    const { municipality: _m, address: _a, prop_class: _c, year_built: _y, dwelling_type: _d, ...asked } = fx.raw.property;
    app1.edit(created.id, { raw: { work_items: fx.raw.work_items, costs: fx.raw.costs, performed_by: {}, property: asked }, team: { ...created.job.team, ...teamIds(fx, ids) } });
    app1.confirm(created.id);
    app1.approveScope(created.id, null);
    const saved = (await app1.packet(created.id)).pdf;
    onDisk.db.close();

    const app2 = jobs(new Store(file));
    const reopened = app2.view(created.id);
    expect(reopened.stage).toBe('printed');
    expect(Buffer.from((await app2.packet(created.id)).pdf).equals(Buffer.from(saved))).toBe(true);
    expect(Buffer.from(saved).equals(Buffer.from(first))).toBe(true);
  });
});

// ── 5. Guardrails ─────────────────────────────────────────────────────────────

describe('guardrails', () => {
  it('no packet before Confirm', async () => {
    const { app, v } = await enterByHand(loadJob('J-01.yaml'));
    await expect(app.packet(v.id)).rejects.toThrow(JobError);
  });

  it('changing a fact after Confirm clears Confirm and the narrative approval', async () => {
    const { app, v } = await enterByHand(loadJob('J-01.yaml'));
    app.confirm(v.id);
    app.approveScope(v.id, ['Remove the kitchen wall and remodel the kitchen.']);
    expect(app.view(v.id).stage).toBe('print');
    const raw = structuredClone(v.job.raw);
    (raw.work_items.find((i) => i.id === 'electrical') as Record<string, unknown>).devices = 20;
    const after = app.edit(v.id, { raw });
    expect(after.stage).toBe('review');
    expect(after.job.confirmed).toBeNull();
    expect(after.job.narrative).toEqual({ paragraphs: ['Remove the kitchen wall and remodel the kitchen.'], approved: false });
  });

  it('editing an approved scope of work keeps Confirm but needs approval again before the packet prints again', async () => {
    const { app, v } = await enterByHand(loadJob('J-01.yaml'));
    app.confirm(v.id);
    app.approveScope(v.id, ['Remove the kitchen wall and remodel the kitchen.']);
    await app.packet(v.id);
    const reopened = app.reopenScope(v.id);
    expect(reopened.stage).toBe('print');
    expect(reopened.job.printed).toBeNull();
    expect(reopened.job.narrative).toEqual({ paragraphs: ['Remove the kitchen wall and remodel the kitchen.'], approved: false });
    await expect(app.packet(v.id)).rejects.toThrow(JobError);
  });

  it('an empty scope of work is not approved; the plain list is chosen on purpose', async () => {
    const { app, v } = await enterByHand(loadJob('J-01.yaml'));
    app.confirm(v.id);
    expect(() => app.approveScope(v.id, ['', '  '])).toThrow('Write the scope of work, or choose the plain list.');
    expect(app.view(v.id).job.narrative).toBeNull();
    expect(app.approveScope(v.id, null).job.narrative).toEqual({ paragraphs: [], approved: true });
  });

  it('a job confirmed under older rules says so and asks for a fresh review; the printed PDF is kept', async () => {
    const { store, app, v } = await enterByHand(loadJob('J-01.yaml'));
    app.confirm(v.id);
    app.approveScope(v.id, null);
    const printed = (await app.packet(v.id)).pdf;
    const sources = readRuleSources();
    sources[0] = { ...sources[0], text: sources[0].text + '\n# edited\n' };
    const newer = jobs(store, noAi, () => compileRules(sources)).view(v.id);
    expect(newer.d.rules_version).not.toBe(v.d.rules_version);
    expect(newer.rules_changed).toBe(true);
    expect(newer.stage).toBe('review');
    expect(app.printedPacket(v.id)).toEqual(printed);
  });

  it('J-08 with an expired HVACR license: the warning shows and the packet still prints (LC-03)', async () => {
    const { app, v } = await enterByHand(loadJob('J-08.yaml'));
    expect(v.d.flags.map((f) => f.id)).toContain('LC-03');
    expect(v.blockers).toEqual([]);
    app.confirm(v.id);
    app.approveScope(v.id, null);
    const texts = await pageTexts((await app.packet(v.id)).pdf);
    expect(texts[0]).toMatch(/Northside/);
  });

  it('three or more homes stops the job (SC-01); Confirm says why', async () => {
    const fx = loadJob('J-01.yaml');
    const { app, v } = await enterByHand(fx);
    const stopped = app.edit(v.id, { home_type: 'three_or_more_units' });
    expect(stopped.d.outcome).toBe('out_of_scope');
    expect(stopped.blockers.join(' ')).toMatch(/one- and two-family/);
    expect(() => app.confirm(v.id)).toThrow(JobError);
  });

  it('a home type that disagrees with the tax record is pointed out; the choice still counts', async () => {
    const fx = loadJob('J-01.yaml');
    const { app, v } = await enterByHand(fx);
    const site = { ...v.job.site, dwelling_units: 4 };
    const checked = app.edit(v.id, { site });
    expect(checked.home_type_note).toMatch(/4 dwelling units/);
    expect(checked.facts.property.dwelling_type).toBe('detached_1f');
    expect(app.edit(v.id, { site: { ...site, dwelling_units: 1 } }).home_type_note).toBeNull();
  });

  it("work the app can't classify blocks Confirm until it's removed, then it's listed on the cover checklist", async () => {
    const fx = loadJob('J-01.yaml');
    const { store } = testStore();
    const rec = structuredClone(recordings('J-01').extract!) as Recording & { output: Record<string, any> };
    rec.output.not_covered = ['Build a deck off the kitchen'];
    const app = jobs(store, replayTransport({ extract: rec }));
    const v = await app.create(describeScreen(fx));
    expect(v.job.not_covered).toEqual(['Build a deck off the kitchen']);
    expect(v.blockers.join(' ')).toMatch(/can't classify/);
    expect(() => app.confirm(v.id)).toThrow(JobError);
    app.setNotCovered(v.id, 'Build a deck off the kitchen', 'remove');
    app.confirm(v.id);
    app.approveScope(v.id, null);
    const cover = (await pageTexts((await app.packet(v.id)).pdf))[0];
    expect(cover).toMatch(/Not in this packet/);
    expect(cover).toMatch(/Build a deck off the kitchen/);
  });

  it('answers must be open questions with allowed values; counts are whole numbers', async () => {
    const fx = loadJob('J-03.yaml');
    const { store } = testStore();
    const app = jobs(store, replayTransport(recordings('J-03')));
    const v = await app.create(describeScreen(fx));
    await expect(app.answer(v.id, { 'nothing.here': 'yes' })).rejects.toThrow(/isn't an open question/);
    const choice = v.questions.find((q) => q.options.length)!;
    await expect(app.answer(v.id, { [choice.key]: 'maybe' })).rejects.toThrow(/isn't one of the answers/);
  });
});

// ── 6. Nothing private is sent ────────────────────────────────────────────────

describe('nothing private is sent', () => {
  it('a full job (extract, questions, scope) sends no profile, directory, owner or FEIN details', async () => {
    const fx = loadJob('J-03.yaml');
    const sent: string[] = [];
    const replay = replayTransport(recordings('J-03'));
    const spy: Transport = (req, settings) => {
      sent.push(`${req.system}\n${req.user}`);
      return replay(req as AiRequest<any>, settings);
    };
    const { store } = testStore();
    const app = jobs(store, spy);
    const input = describeScreen(fx);
    let v = await app.create(input);
    const matches = alignItems(v.facts.work_items, fx.before.work_items);
    while (v.questions.length) v = await app.answer(v.id, Object.fromEntries(v.questions.map((q) => [q.key, approvedAnswer(renameKey(q.key, matches), fx.after)])));
    app.confirm(v.id);
    await app.draftScope(v.id);
    expect(sent.length).toBeGreaterThanOrEqual(3);

    const a = profile.applicant;
    const privateBits = [
      a.name, a.fein!, a.hic_registration!, a.phone!, a.email!, a.address!.street,
      ...Object.values(profile.subcontractors).flatMap((s) => [s.license, s.phone!, s.email!, s.address!.street]),
      input.owner.name, input.owner.phone, input.owner.email,
    ].filter((x): x is string => !!x);
    for (const text of sent) for (const bit of privateBits) expect(text.includes(bit), bit).toBe(false);
  });
});

// ── 7. The engine stays separate ──────────────────────────────────────────────

describe('the engine stays separate', () => {
  it('src/engine imports only its own files, zod, yaml and node:crypto (no I/O, network, AI, app or database)', () => {
    const dir = new URL('../src/engine/', import.meta.url).pathname;
    const allowed = /^(\.\/|zod$|yaml$|node:crypto$)/;
    const bad: string[] = [];
    for (const file of readdirSync(dir)) {
      for (const [, from] of readFileSync(dir + file, 'utf8').matchAll(/from '([^']+)'/g)) if (!allowed.test(from)) bad.push(`${file}: ${from}`);
    }
    expect(bad).toEqual([]);
  });
});
