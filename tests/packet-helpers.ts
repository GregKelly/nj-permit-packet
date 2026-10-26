// Loads the packet test inputs (tests/packets/*.yaml) and reads PDFs back for checking.

import { existsSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { determine, type Determinations, type RuleSet } from '../src/engine';
import type { FieldValue } from '../src/packet/fill';
import type { PacketJob, PacketProfile, Subcontractor } from '../src/packet/types';
import { applyAnswers, buildFacts, loadJob, profile, TODAY } from './helpers';

const PACKETS_DIR = new URL('./packets/', import.meta.url).pathname;
const parties: Record<string, Record<string, FieldValue>> = parse(readFileSync(PACKETS_DIR + '_parties.yaml', 'utf8'));

/** The MW/FULL test jobs (M2 plan: done when these pass), plus the homeowner jobs that print. */
export const PACKET_JOBS = ['J-01', 'J-03', 'J-04', 'J-05', 'J-05b', 'J-07', 'J-08', 'J-09', 'J-10', 'J-11', 'J-12a', 'J-13b'];

/** Jobs where the owner is the F100 applicant (HO-F1), so there's no owner authorization page (HO-F2). */
export const OWNER_APPLICANT_JOBS = ['J-11', 'J-12a', 'J-13b'];

export const packetProfile: PacketProfile = {
  applicant: profile.applicant,
  subcontractors: Object.values(profile.subcontractors) as Subcontractor[],
};

export interface PacketFixture {
  id: string;
  job: PacketJob;
  d: Determinations;
  /** Form → our field name → expected value. Every box not listed must stay blank. */
  expected: Record<string, Record<string, FieldValue>>;
}

/** A test job with its packet inputs. `team` swaps subcontractors, e.g. { hvacr: 'clearair' }. */
export function loadPacketJob(id: string, rules: RuleSet, team?: Record<string, string>): PacketFixture {
  const fixture = loadJob(`${id}.yaml`);
  const facts = team ? buildFacts(applyAnswers({ ...fixture.raw, team: { ...fixture.raw.team, ...team } }, fixture.answers)) : fixture.after;
  const file = `${PACKETS_DIR}${id}.yaml`;
  const packet = existsSync(file) ? parse(readFileSync(file, 'utf8'), { merge: true }) : null;
  const job: PacketJob = {
    ref: id,
    facts,
    site: packet?.site ?? { block: '100', lot: '1', zip: '07040' },
    owner: packet?.owner ?? { name: 'Test Owner', address: { street: facts.property.address, city: 'Maplewood', state: 'NJ', zip: '07040' } },
  };
  const expected: PacketFixture['expected'] = {};
  for (const [form, entries] of Object.entries((packet?.expected ?? {}) as Record<string, Record<string, FieldValue>>)) {
    if (!/^F\d+$/.test(form)) continue; // shared blocks like site_owner
    const { contractor, ...rest } = entries;
    expected[form] = { ...(contractor ? parties[contractor as string] : {}), ...rest };
  }
  return { id, job, d: determine(facts, rules, TODAY), expected };
}

/** Swap a party block in expected entries (e.g. Northside → Clearair). */
export function partyBlock(key: string): Record<string, FieldValue> {
  return parties[key];
}

/** The text of each page of a PDF, via pdf.js (pages joined with line breaks between text runs). */
export async function pageTexts(pdf: Uint8Array): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({
    data: pdf.slice(),
    useSystemFonts: false,
    standardFontDataUrl: new URL('../node_modules/pdfjs-dist/standard_fonts/', import.meta.url).pathname,
  }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    out.push(
      content.items
        .map((it) => ('str' in it ? it.str + (it.hasEOL ? '\n' : ' ') : ''))
        .join('')
        .replace(/[ \t]+/g, ' '),
    );
  }
  await doc.cleanup();
  return out;
}
