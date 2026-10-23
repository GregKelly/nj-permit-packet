// The packet builder (M2 plan, "Tests"). Done when the field read-back tests
// pass for every MW/FULL test job.

import { PDFDocument } from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';
import type { RuleSet } from '../src/engine';
import { buildPacket } from '../src/packet/build';
import { formValues } from '../src/packet/entries';
import { fillForm, readFields } from '../src/packet/fill';
import { officialForm, officialForms, sha256 } from '../src/packet/forms';
import { loadRules } from '../src/rules-dir';
import { TODAY } from './helpers';
import { loadPacketJob, packetProfile, PACKET_JOBS, pageTexts, partyBlock, type PacketFixture } from './packet-helpers';

let rules: RuleSet;
beforeAll(() => {
  rules = loadRules();
});

/** Every field of the blank official form, by PDF name. */
const blanks = new Map<string, Record<string, string | boolean>>();
async function blankFields(form: string) {
  if (!blanks.has(form)) blanks.set(form, readFields(await PDFDocument.load(officialForm(form).bytes)));
  return blanks.get(form)!;
}

/**
 * Fill a form without flattening, read every field back, and compare each with
 * the expected entry (by our name) or, for a box with no expected entry, with
 * the blank form.
 */
async function readBack(f: PacketFixture, form: string) {
  const values = formValues(f.job, f.d, packetProfile)[form];
  const doc = await fillForm(form, values, { flatten: false });
  const got = readFields(doc);
  const blank = await blankFields(form);
  const ourName = Object.fromEntries(Object.entries(officialForm(form).map.fields).map(([ours, pdf]) => [pdf, ours]));
  const expected = f.expected[form];
  const mismatches: string[] = [];
  for (const [pdfName, value] of Object.entries(got)) {
    const ours = ourName[pdfName];
    const want = ours !== undefined && ours in expected ? expected[ours] : blank[pdfName];
    if (value !== want) mismatches.push(`${ours ?? '(not mapped)'} [${pdfName}]: got ${JSON.stringify(value)}, expected ${JSON.stringify(want)}`);
  }
  for (const ours of Object.keys(expected)) {
    if (!(ours in officialForm(form).map.fields)) mismatches.push(`${ours}: expected, but not in ${form}.map.yaml`);
  }
  return mismatches;
}

for (const id of PACKET_JOBS) {
  describe(`${id} packet`, () => {
    let f: PacketFixture;
    beforeAll(() => {
      f = loadPacketJob(id, rules);
    });

    it('has expected entries for exactly the forms the engine selected', () => {
      expect(Object.keys(f.expected).sort()).toEqual(f.d.forms.map((x) => x.form).sort());
    });

    it('field read-back: every box holds its expected entry, and every other box is blank', async () => {
      for (const form of f.d.forms.map((x) => x.form)) {
        expect(await readBack(f, form), form).toEqual([]);
      }
    });

    it('right forms, right order, right page counts; nothing left editable', async () => {
      const result = await buildPacket(f.job, f.d, packetProfile, TODAY);
      if (result.kind === 'none') throw new Error(result.reason);
      expect(result.kind).toBe('packet');
      const order = ['F100', 'F110', 'F120', 'F130', 'F145', 'F370'].filter((x) => f.d.forms.some((y) => y.form === x));
      const parts = result.pages.map((p) => p.form ?? p.part);
      expect(parts).toEqual(['cover', 'F100', 'owner_authorization', ...order.slice(1), 'scope']);
      for (const p of result.pages.filter((x) => x.form)) expect(p.pages, p.form).toBe(officialForm(p.form!).pages);
      const doc = await PDFDocument.load(result.pdf);
      const last = result.pages.at(-1)!;
      expect(doc.getPageCount()).toBe(last.start + last.pages - 1);
      expect(doc.getForm().getFields()).toEqual([]);
    });

    it('flattened forms print their entries', async () => {
      const result = await buildPacket(f.job, f.d, packetProfile, TODAY);
      if (result.kind === 'none') throw new Error(result.reason);
      const texts = await pageTexts(result.pdf);
      const f100 = result.pages.find((p) => p.form === 'F100')!;
      const f100Text = texts.slice(f100.start - 1, f100.start - 1 + f100.pages).join('\n');
      expect(f100Text).toContain(String(f.expected.F100['est_cost.total']));
      expect(f100Text).toContain(f.job.owner.name);
    });
  });
}

describe('cover checklist says the right things', () => {
  const text = async (id: string, team?: Record<string, string>) => {
    const f = loadPacketJob(id, rules, team);
    const result = await buildPacket(f.job, f.d, packetProfile, TODAY);
    if (result.kind === 'none') throw new Error(result.reason);
    const cover = result.pages.find((p) => p.part === 'cover')!;
    const texts = await pageTexts(result.pdf);
    return { f, result, cover: squash(texts.slice(cover.start - 1, cover.start - 1 + cover.pages).join('\n')), texts };
  };

  it('J-01: signers, fill-ins, plans, copies, tips, assumptions, footer', async () => {
    const { cover, f } = await text('J-01');
    expect(cover).toContain("Keep this page, don't submit it");
    for (const signer of ['Hollis Building Co. LLC', 'Watts Electric LLC', 'Sutton Plumbing & Heating', 'Ana and Luis Moreno']) expect(cover).toContain(signer);
    expect(cover).toContain('Watts Electric LLC: fill in KW Dishwasher/Disposal size on F120');
    expect(cover).toContain('Floor plan required');
    expect(cover).toContain('Submit one original plus three copies of each completed form.');
    expect(cover).toContain('Bring at least two copies of the plans.');
    expect(cover).toContain('TP-05');
    expect(cover).toContain('A-22');
    expect(cover).toContain(`Rules version ${f.d.rules_version}`);
    expect(cover).toContain('Prepared 2026-10-22');
    expect(cover).not.toContain('WARNING');
  });

  it('J-03: zoning permit first, with its checklist, and sealed plans', async () => {
    const { cover } = await text('J-03');
    expect(cover).toContain('Zoning permit required before submitting the construction permit.');
    expect(cover).toContain('Impervious coverage calculation');
    expect(cover).toContain('Zoning approval');
    expect(cover).toContain('sealed by an NJ-licensed architect or engineer');
    expect(cover.indexOf('Zoning permit required')).toBeLessThan(cover.indexOf('Plans required'));
  });

  it('J-04: the fuel fill-in for Clearair', async () => {
    const { cover } = await text('J-04');
    expect(cover).toContain('Clearair Mechanical: fill in Heating system fuel on F145');
  });

  it('J-08: the two minor-work steps come first, then the zoning note', async () => {
    const { cover } = await text('J-08');
    const notify = cover.indexOf('Notify the construction office before work starts');
    const file = cover.indexOf('File this packet within 5 business days of the notice');
    const zoning = cover.indexOf('Zoning permit probably not required');
    expect(notify).toBeGreaterThan(-1);
    expect(file).toBeGreaterThan(notify);
    expect(zoning).toBeGreaterThan(file);
    expect(cover).toContain('Watts Electric LLC: fill in KW Central AC Unit size, HP/KW Furnace size on F120');
    expect(cover).not.toContain('Bring at least two copies of the plans.');
  });

  it('J-08 as written: builds the full packet with the LC-03 warning at the top', async () => {
    const { cover, result } = await text('J-08');
    expect(result.kind).toBe('packet');
    expect(cover.indexOf('WARNING')).toBeLessThan(cover.indexOf('Steps, in order'));
    expect(cover).toContain("Northside Heating & Cooling's HVACR license expired 2026-09-30");
  });

  it('J-08 with Clearair: the same packet without the warning', async () => {
    const northside = await text('J-08');
    const clearair = await text('J-08', { hvacr: 'clearair' });
    expect(clearair.cover).not.toContain('WARNING');
    expect(clearair.result.kind === 'packet' && clearair.result.pages).toEqual(northside.result.kind === 'packet' && northside.result.pages);
    const f = clearair.f;
    for (const form of ['F145', 'F370']) {
      const values = formValues(f.job, f.d, packetProfile)[form];
      const swap = form === 'F145' ? partyBlock('clearair') : partyBlock('f370_clearair');
      for (const [k, v] of Object.entries(swap)) expect(values[k], `${form} ${k}`).toEqual(v);
    }
  });
});

describe('our other pages', () => {
  const build = async (id: string) => {
    const f = loadPacketJob(id, rules);
    const result = await buildPacket(f.job, f.d, packetProfile, TODAY);
    if (result.kind === 'none') throw new Error(result.reason);
    return { f, result, texts: (await pageTexts(result.pdf)).map(squash) };
  };

  it('J-02: one-page "no permit needed" sheet listing every item with its rule', async () => {
    const { f, result, texts } = await build('J-02');
    expect(result.kind).toBe('no_permit');
    expect(texts).toHaveLength(1);
    expect(texts[0]).toContain('No permit needed');
    for (const item of f.d.items) {
      expect(texts[0]).toContain(item.label);
      expect(texts[0]).toContain(item.rule_id!);
    }
    expect(texts[0]).toContain('No zoning application needed for interior work.');
  });

  it('J-06: "no permit needed" sheet with the zoning "confirm" note and lead tip', async () => {
    const { texts } = await build('J-06');
    expect(texts[0]).toContain('No permit needed');
    expect(texts[0]).toContain('Zoning permit probably not required for like-for-like replacement.');
    expect(texts[0]).toContain('TP-05');
  });

  it('owner authorization names the owner, the contractor and the site', async () => {
    const { f, result, texts } = await build('J-01');
    const page = texts[result.pages.find((p) => p.part === 'owner_authorization')!.start - 1];
    expect(page).toContain('Owner authorization');
    expect(page).toContain(f.job.owner.name);
    expect(page).toContain('Hollis Building Co. LLC');
    expect(page).toContain('34 Oakview Ave, Maplewood, NJ 07040');
    expect(page).toContain('Block 4101, Lot 7');
  });

  it('scope of work lists each item grouped by trade, with that trade cost', async () => {
    const { result, texts } = await build('J-01');
    const scope = result.pages.find((p) => p.part === 'scope')!;
    const page = texts.slice(scope.start - 1, scope.start - 1 + scope.pages).join('\n');
    expect(page).toContain('Building (F110) $39,000');
    expect(page).toContain('Electrical (F120) $5,500');
    expect(page).toContain('Plumbing (F130) $3,500');
    expect(page).toContain('Remove wall between kitchen and dining room');
    expect(page).toContain('New cabinets'); // ordinary maintenance items are listed too
  });

  it('a job the app can’t handle gets no packet, just the reason', async () => {
    const f = loadPacketJob('J-01', rules);
    f.job.facts.property.municipality = 'South Orange';
    const { determine } = await import('../src/engine');
    const d = determine(f.job.facts, rules, TODAY);
    const result = await buildPacket(f.job, d, packetProfile, TODAY);
    expect(result).toEqual({ kind: 'none', reason: d.flags[0].message });
  });
});

describe('official forms', () => {
  it("haven't changed since their field maps were checked", () => {
    for (const form of officialForms().values()) expect(sha256(form.bytes), form.file).toBe(form.sha256);
  });

  it('have the page counts recorded in forms.yaml', async () => {
    for (const form of officialForms().values()) expect((await PDFDocument.load(form.bytes)).getPageCount(), form.id).toBe(form.pages);
  });

  it('every mapped field exists in its PDF', async () => {
    for (const form of officialForms().values()) {
      const names = new Set(Object.keys(await blankFields(form.id)));
      for (const pdf of Object.values(form.map.fields)) expect(names.has(pdf), `${form.id}: ${pdf}`).toBe(true);
    }
  });

  it('every quantity line in the rules has a row on its form', () => {
    for (const line of rules.lines) {
      expect(officialForm(line.form).map.lines[line.line], `${line.form} "${line.line}"`).toBeDefined();
    }
  });

  it('every form the rules can put in a packet has an official PDF', () => {
    const used = new Set(rules.itemRules.flatMap((r) => (r.then ? [r.then] : r.cases!.map((c) => c.then)).flatMap((t) => t.forms)));
    for (const form of ['F100', ...used]) expect(officialForms().has(form), form).toBe(true);
  });
});

describe('determinism', () => {
  for (const id of ['J-01', 'J-08', 'J-02']) {
    it(`${id}: building twice gives the identical PDF`, async () => {
      const a = loadPacketJob(id, rules);
      const b = loadPacketJob(id, loadRules());
      const ra = await buildPacket(a.job, a.d, packetProfile, TODAY);
      const rb = await buildPacket(b.job, b.d, packetProfile, TODAY);
      if (ra.kind === 'none' || rb.kind === 'none') throw new Error('no packet');
      expect(sha256(ra.pdf)).toBe(sha256(rb.pdf));
    });
  }
});

/** Collapse whitespace so text checks don't depend on line breaks. */
function squash(s: string): string {
  return s.replace(/\s+/g, ' ');
}
