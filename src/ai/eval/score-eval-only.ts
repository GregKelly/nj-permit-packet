// Scoring the eval-only descriptions (docs/eval-jobs-m3.md). They have no
// answer key for every fact, only what must stay unknown, what must be
// extracted, and what must be flagged (format: tests/ai/eval-jobs/_format.md).

import type { JobFacts, Question } from '../../engine';
import { UNKNOWN } from '../../engine/facts';
import type { ExtractedJob } from '../extract';
import type { WordedQuestion } from '../questions';
import type { FactDiff, Raw } from './score';

export interface EvalOnlySpec {
  id: string;
  title: string;
  description: string;
  items?: Record<string, { match: Raw; unknown?: string[]; facts?: Raw; optional?: boolean }>;
  costs?: Record<string, number>;
  null_costs?: string[];
  property?: { unknown?: string[]; facts?: Raw };
  performed_by?: Record<string, string>;
  not_owner?: string[];
  named?: { trade: string; name: string; match: string | null }[];
  not_covered?: string[];
  follow_ups?: { key?: string; match?: Raw; fact?: string; quote: string }[];
}

export interface EvalOnlyScore {
  guessed: FactDiff[];
  wrong: FactDiff[];
  missed: FactDiff[];
  /** Flags, names and follow-ups that weren't as required. */
  failed: string[];
}

const matches = (item: Raw, match: Raw) => Object.entries(match).every(([k, v]) => item[k] === v);

export function scoreFacts(spec: EvalOnlySpec, ex: ExtractedJob, facts: JobFacts): EvalOnlyScore {
  const s: EvalOnlyScore = { guessed: [], wrong: [], missed: [], failed: [] };
  for (const [name, want] of Object.entries(spec.items ?? {})) {
    const found = facts.work_items.filter((i) => matches(i, want.match));
    if (!found.length) {
      if (!want.optional) s.failed.push(`No work item for "${name}" (${JSON.stringify(want.match)}).`);
      continue;
    }
    for (const item of found) {
      for (const f of want.unknown ?? []) if (item[f] !== UNKNOWN) s.guessed.push({ key: `${name}.${f}`, expected: UNKNOWN, got: item[f] });
      for (const [f, v] of Object.entries(want.facts ?? {})) {
        if (item[f] === v) continue;
        (item[f] === UNKNOWN ? s.missed : s.wrong).push({ key: `${name}.${f}`, expected: v, got: item[f] });
      }
    }
  }
  const costs = facts.costs as Raw;
  for (const [k, v] of Object.entries(spec.costs ?? {})) {
    if (costs[k] !== v) (costs[k] === null ? s.missed : s.wrong).push({ key: `costs.${k}`, expected: v, got: costs[k] });
  }
  for (const k of spec.null_costs ?? []) if (costs[k] !== null) s.guessed.push({ key: `costs.${k}`, expected: null, got: costs[k] });

  // Property facts as the AI gave them (the eval supplies no dwelling type of its own).
  const property = ex.raw.property;
  for (const f of spec.property?.unknown ?? []) if (property[f] !== undefined) s.guessed.push({ key: `property.${f}`, expected: UNKNOWN, got: property[f] });
  for (const [f, v] of Object.entries(spec.property?.facts ?? {})) {
    if (property[f] !== v) (property[f] === undefined ? s.missed : s.wrong).push({ key: `property.${f}`, expected: v, got: property[f] ?? UNKNOWN });
  }

  for (const [trade, who] of Object.entries(spec.performed_by ?? {})) {
    if (ex.raw.performed_by[trade] !== who) s.wrong.push({ key: `performed_by.${trade}`, expected: who, got: ex.raw.performed_by[trade] ?? 'contractor' });
  }
  for (const trade of spec.not_owner ?? []) {
    if (ex.raw.performed_by[trade]) s.guessed.push({ key: `performed_by.${trade}`, expected: 'not the owner', got: ex.raw.performed_by[trade] });
  }
  for (const want of spec.named ?? []) {
    const got = ex.named.find((n) => n.trade === want.trade);
    if (!got || !got.name.toLowerCase().includes(want.name.toLowerCase())) s.failed.push(`Expected "${want.name}" returned as the named person for ${want.trade}; got ${got ? `"${got.name}"` : 'nothing'}.`);
    else if (got.match !== want.match) s.failed.push(`"${got.name}" matched directory entry ${got.match ?? 'none'}; expected ${want.match ?? 'none'}.`);
  }
  for (const words of spec.not_covered ?? []) {
    if (!ex.not_covered.some((n) => n.toLowerCase().includes(words.toLowerCase()))) s.failed.push(`"${words}" wasn't returned as not covered (got: ${JSON.stringify(ex.not_covered)}).`);
  }
  return s;
}

/** Find the engine question a follow-up spec refers to. */
export function findFollowUp(want: NonNullable<EvalOnlySpec['follow_ups']>[number], asked: Question[], facts: JobFacts): Question | undefined {
  if (want.key) return asked.find((q) => q.key === want.key);
  const ids = facts.work_items.filter((i) => matches(i, want.match!)).map((i) => i.id);
  return asked.find((q) => q.item_id && ids.includes(q.item_id) && q.fact === want.fact);
}

/** Round-1 follow-ups: asked by the engine, quoting the contractor's words (plan, change 1). */
export function scoreFollowUps(spec: EvalOnlySpec, asked: Question[], facts: JobFacts, quotes: Record<string, string>, worded: WordedQuestion[] | null): string[] {
  const failed: string[] = [];
  for (const want of spec.follow_ups ?? []) {
    const label = want.key ?? `${JSON.stringify(want.match)}.${want.fact}`;
    const q = findFollowUp(want, asked, facts);
    if (!q) {
      failed.push(`The engine didn't ask about ${label}.`);
      continue;
    }
    const quote = quotes[q.key];
    if (!quote?.toLowerCase().includes(want.quote.toLowerCase())) failed.push(`No quote with "${want.quote}" for ${q.key} (got ${quote ? `"${quote}"` : 'none'}).`);
    const text = worded?.find((w) => w.key === q.key)?.text;
    if (worded && !text?.toLowerCase().includes(want.quote.toLowerCase())) failed.push(`The question for ${q.key} doesn't refer to "${want.quote}": ${JSON.stringify(text)}`);
  }
  return failed;
}
