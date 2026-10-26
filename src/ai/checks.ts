// Plain-code checks on every AI answer (M3 plan, "The checks"). No AI here.
// Each check returns a list of problems in plain words; empty means it passed.

import type { Determinations, Question } from '../engine';
import { UNKNOWN, WORK_ITEM_KINDS } from '../engine/facts';
import type { ExtractOutput, QuestionsOutput, ScopeOutput } from './schema';

/** Collapse runs of whitespace, so a quote spanning a line break in the description still matches. */
export const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Dollar amounts written in the text: "$48,000" → 48000, "$32k" → 32000, "$1.5k" → 1500. */
export function dollarAmounts(text: string): number[] {
  return [...text.matchAll(/\$\s?(\d[\d,]*(?:\.\d+)?)\s?(k\b|K\b)?/g)].map((m) => {
    const n = Number(m[1].replace(/,/g, ''));
    return Math.round(m[2] ? n * 1000 : n);
  });
}

const COST_KEYS = ['total', 'building', 'electrical', 'plumbing', 'mechanical'] as const;

export function checkExtract(out: ExtractOutput, description: string): string[] {
  const problems: string[] = [];
  const text = squash(description);
  const items = new Map<string, Record<string, unknown>>();

  for (const item of out.work_items as Record<string, unknown>[]) {
    const id = item.id as string;
    if (!/^[a-z][a-z0-9_]*$/.test(id)) problems.push(`Work item id "${id}" must be lower_snake_case.`);
    if (items.has(id)) problems.push(`Two work items have the id "${id}".`);
    items.set(id, item);
    for (const f of (item.fixtures as { fixture: string; count: number }[] | undefined) ?? []) {
      if (f.count < 1) problems.push(`Work item "${id}": fixture ${f.fixture} has count ${f.count}; list only fixtures it installs.`);
    }
    const count = Object.entries(item).find(([k, v]) => WORK_ITEM_KINDS[item.kind as string][k]?.type === 'count' && typeof v === 'number' && v < 0);
    if (count) problems.push(`Work item "${id}": ${count[0]} can't be negative.`);
  }

  const stated = new Set(dollarAmounts(text));
  for (const key of COST_KEYS) {
    const value = out.costs[key];
    if (value !== null && !stated.has(value)) {
      problems.push(`costs.${key} is ${value}, but the description doesn't state that amount. Leave it null unless the description gives that exact figure.`);
    }
  }

  for (const [trade, who] of Object.entries(out.performed_by)) {
    if (who.who === 'named' && !who.name) problems.push(`performed_by.${trade} is "named" but has no name.`);
    for (const id of who.owner_item_ids) if (!items.has(id)) problems.push(`performed_by.${trade}: no work item "${id}".`);
  }

  for (const { key, quote } of out.quotes) {
    if (!text.includes(squash(quote))) problems.push(`The quote for ${key}, "${quote}", isn't word for word in the description.`);
    const [head, fact] = key.split('.');
    let value: unknown;
    if (head === 'costs') value = (out.costs as Record<string, unknown>)[fact];
    else if (head === 'property') value = (out.property as Record<string, unknown>)[fact];
    else value = items.get(head)?.[fact];
    if (value === undefined) problems.push(`The quote key ${key} doesn't name a fact in your answer.`);
    else if (value !== UNKNOWN && value !== null) problems.push(`The quote key ${key} is for a fact you gave a value; quotes are only for unknown facts and null costs.`);
  }
  return problems;
}

/** The answer values a question must offer: the engine's options plus "unknown" (Don't know). */
export const answerValues = (q: Question) => (q.options.length ? [...q.options, UNKNOWN] : []);

const isAmount = (q: Question) => q.key.startsWith('costs.');

export function checkQuestions(out: QuestionsOutput, asked: Question[]): string[] {
  const problems: string[] = [];
  const want = new Map(asked.map((q) => [q.key, q]));
  const seen = new Set<string>();
  for (const q of out.questions) {
    const engine = want.get(q.key);
    if (!engine) {
      problems.push(`Question ${q.key} wasn't asked for; write questions only for the keys given.`);
      continue;
    }
    if (seen.has(q.key)) problems.push(`Two questions for ${q.key}.`);
    seen.add(q.key);
    const values = q.options.map((o) => o.value);
    const expected = answerValues(engine);
    if (values.length !== expected.length || expected.some((v) => !values.includes(v))) {
      problems.push(`Question ${q.key} must offer exactly these answer values: ${expected.length ? expected.join(', ') : 'none (a number is typed in)'}.`);
    }
    if (q.options.some((o) => !o.label.trim())) problems.push(`Question ${q.key} has an answer with no label.`);
    if (isAmount(engine) && !(/\b(one|single)\b/i.test(q.text) && /estimat/i.test(q.text))) {
      problems.push(`Question ${q.key} asks for a cost: it must ask for one (single) dollar amount and say an estimate is fine.`);
    }
  }
  for (const key of want.keys()) if (!seen.has(key)) problems.push(`No question for ${key}.`);
  return problems;
}

/** Numbers written in a text: "80k" → 80 and 80000, "$48,000" → 48000, "3-ton" → 3, "20A" → 20. */
export function numbersIn(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s?(k\b|K\b)?/g)) {
    const n = Number(m[1].replace(/,/g, ''));
    out.push(n);
    if (m[2]) out.push(Math.round(n * 1000));
  }
  return out;
}

const CITATION = /N\.?J\.?A\.?C|N\.?J\.?S\.?A|\b5:23\b|\bF1[0-4]\d\b|\bF370\b|\bF100\b/;

export function checkScope(out: ScopeOutput, facts: { work_items: { id: string; label: string; [k: string]: unknown }[]; costs: Record<string, number | null> }, d: Determinations): string[] {
  const problems: string[] = [];
  const ids = new Set(facts.work_items.map((i) => i.id));
  const mentioned = new Set<string>();

  // Every number in the narrative must come from the confirmed facts: labels, counts, sizes and costs.
  const known = new Set<number>();
  for (const item of facts.work_items) {
    numbersIn(item.label).forEach((n) => known.add(n));
    for (const [k, v] of Object.entries(item)) {
      if (typeof v === 'number') known.add(v);
      if (k === 'kw' && typeof v === 'string') numbersIn(v).forEach((n) => known.add(n));
      if (k === 'fixtures' && v && typeof v === 'object') Object.values(v as Record<string, number>).forEach((n) => known.add(n));
    }
  }
  for (const v of Object.values(facts.costs)) if (typeof v === 'number') known.add(v);
  for (const e of Object.values(d.form_entries)) {
    for (const v of [e.total_cost, e.est_cost, e.rehabilitation_cost, ...Object.values(e.cost_by_subcode ?? {})]) if (typeof v === 'number') known.add(v);
  }

  for (const section of out.sections) {
    for (const s of section.sentences) {
      if (!s.item_ids.length) problems.push(`The sentence "${s.text}" isn't tagged with any work item.`);
      for (const id of s.item_ids) {
        if (ids.has(id)) mentioned.add(id);
        else problems.push(`The sentence "${s.text}" points to work item "${id}", which doesn't exist.`);
      }
      for (const n of numbersIn(s.text)) {
        if (!known.has(n)) problems.push(`The sentence "${s.text}" has the number ${n}, which isn't in the confirmed facts.`);
      }
      if (CITATION.test(s.text)) problems.push(`The sentence "${s.text}" names a code section or form; leave those to the forms.`);
    }
  }
  for (const i of d.items) {
    if ((i.tier === 'MW' || i.tier === 'FULL') && !mentioned.has(i.item_id)) problems.push(`Permitted work item "${i.item_id}" (${i.label}) isn't described.`);
  }
  return problems;
}
