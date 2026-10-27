// A saved job: everything needed to show where it stands and rebuild its packet.

import type { WordedQuestion } from '../ai/questions';
import type { NamedWorker } from '../ai/extract';
import type { Party } from '../packet/types';

/** The work site, as the contractor typed it and confirmed it against the parcel data. */
export interface Site {
  /** As typed, e.g. "34 Oakview Ave". Printed on the forms. */
  street: string;
  /** "Maplewood": from the parcel record the contractor picked, else as typed. */
  municipality: string;
  /** From the typed address; never from the parcel record (its ZIP is the owner's mailing ZIP). */
  zip: string;
  block: string;
  lot: string;
  qualifier?: string;
  prop_class: string;
  year_built: number | null;
  /** The tax record's dwelling-unit count (DWELL), shown beside the home type as a check. Null if entered by hand. */
  dwelling_units: number | null;
  /** The tax record's address, when one was picked ("34 OAKVIEW AVENUE"). */
  parcel_address?: string;
}

export interface NewJob {
  site: Site;
  /** Picked by the contractor on the Describe screen (engine values: detached_1f, detached_2f, attached, three_or_more_units). */
  home_type: string;
  owner: Party;
  description: string;
}

/** Raw facts in the shape the test jobs use: work items, costs, who does each trade, property facts from questions. */
export interface RawFacts {
  work_items: Record<string, unknown>[];
  costs: Record<string, number | null>;
  performed_by: Record<string, unknown>;
  /** Property facts the description or a question supplies (owner_occupied, own_sewer). */
  property: Record<string, unknown>;
}

export type TeamTrade = 'electrical' | 'plumbing' | 'hvacr';

export interface JobRecord extends NewJob {
  raw: RawFacts;
  /** Who does each licensed trade: a subcontractor id from the directory, or null for none picked. */
  team: Partial<Record<TeamTrade, number | null>>;
  /** What the AI added beyond the facts; null when the facts were entered by hand. */
  ai: { quotes: Record<string, string>; named: NamedWorker[] } | null;
  /** Why the AI wasn't used, or why its answer couldn't be (the manual path). */
  ai_note: string | null;
  /** Running total of AI cost for this job, in dollars (estimate from list prices). */
  ai_cost: number;
  /** Every answer given, by question key; "unknown" is "Don't know". */
  answers: Record<string, unknown>;
  /** Questions answered "Don't know": not asked again. */
  declined: string[];
  /** The AI's wording for the current round, by question key. Questions without wording here use the built-in wording. */
  wording: WordedQuestion[];
  /** Names in the description that didn't match the directory, as the contractor resolved them: a sub id, or "owner". */
  names: Record<string, number | 'owner'>;
  /** Work the AI couldn't fit into any item kind, still to be dealt with. */
  not_covered: string[];
  /** Such work the contractor removed; listed on the cover checklist under "Not in this packet". */
  removed: string[];
  /** The contractor's sign-off on facts and determinations, under one rules version. */
  confirmed: { date: string; rules_version: string } | null;
  /** The scope narrative. `approved` with no paragraphs means "use the plain list". */
  narrative: { paragraphs: string[]; approved: boolean; note?: string } | null;
  /** When the packet was printed and under which rules (the PDF itself is saved too). */
  printed: { date: string; rules_version: string } | null;
}
