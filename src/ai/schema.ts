// The shapes the AI must answer in. Built from the same fact specs as the
// engine's schema (src/engine/facts.ts), so the AI can only use values the
// engine understands.
//
// Differences from the engine's schema, all so that "I don't know" is a
// deliberate answer (M3 plan, "How each call works"):
// - every fact is required: a value or `unknown`, never left out;
// - fixtures are a list of {fixture, count} (the API's output formats don't allow open-ended maps);
// - who does each trade is reported as written, and plain code maps it to the engine's facts.
//
// This file uses zod/v4, which can turn a schema into the JSON schema the API
// takes (src/ai/client.ts); the engine keeps the zod v3 API.

import * as z from 'zod/v4';
import { FIXTURE_TYPES, PROPERTY_FACTS, UNKNOWN, WORK_ITEM_KINDS, type FactSpec } from '../engine/facts';

function aiFact(spec: FactSpec) {
  switch (spec.type) {
    case 'choice':
      return z.enum(spec.unknown ? [...spec.values, UNKNOWN] : [...spec.values]);
    case 'count':
      return z.union([z.number().int(), z.literal(UNKNOWN)]);
    case 'fixtures':
      return z.array(z.object({ fixture: z.enum(FIXTURE_TYPES), count: z.number().int() }).strict());
    case 'text':
      return z.string().nullable();
  }
}

const itemSchemas = Object.entries(WORK_ITEM_KINDS).map(([kind, facts]) =>
  z
    .object({
      kind: z.literal(kind),
      id: z.string().describe('lower_snake_case, unique in this job, e.g. "island" or "back_door"'),
      label: z.string().describe("Short plain description of this item, in the contractor's words where possible"),
      ...Object.fromEntries(Object.entries(facts).map(([name, spec]) => [name, aiFact(spec)])),
    })
    .strict(),
);

export const AiWorkItem = z.discriminatedUnion('kind', itemSchemas as unknown as [z.ZodObject, ...z.ZodObject[]]);

const money = z.number().nullable();
const propertyFact = (name: keyof typeof PROPERTY_FACTS) => aiFact(PROPERTY_FACTS[name]);

export const AI_TRADES = ['building', 'electrical', 'plumbing', 'mechanical'] as const;

const who = z
  .object({
    who: z.enum(['not_mentioned', 'contractor', 'owner', 'named']),
    name: z.string().nullable().describe('For "named": the person or company exactly as written'),
    owner_item_ids: z.array(z.string()).describe('For "owner" when the owner does only some of this trade: those work item ids; otherwise empty'),
  })
  .strict();

export const ExtractOutput = z
  .object({
    work_items: z.array(AiWorkItem),
    costs: z.object({ total: money, building: money, electrical: money, plumbing: money, mechanical: money }).strict(),
    performed_by: z.object(Object.fromEntries(AI_TRADES.map((t) => [t, who])) as Record<(typeof AI_TRADES)[number], typeof who>).strict(),
    property: z
      .object({ dwelling_type: propertyFact('dwelling_type'), owner_occupied: propertyFact('owner_occupied'), own_sewer: propertyFact('own_sewer') })
      .strict(),
    quotes: z
      .array(
        z
          .object({
            key: z.string().describe('"<item id>.<fact>", "costs.<total|building|electrical|plumbing|mechanical>" or "property.<fact>"'),
            quote: z.string().describe('The exact words from the description, copied character for character'),
          })
          .strict(),
      )
      .describe('For facts left unknown (or costs left null) that the description says something about'),
    not_covered: z.array(z.string()).describe('Work that fits no item kind, word for word from the description'),
  })
  .strict();

export type ExtractOutput = z.infer<typeof ExtractOutput>;
export type AiWorkItem = z.infer<typeof AiWorkItem>;

export const QuestionsOutput = z
  .object({
    questions: z.array(
      z
        .object({
          key: z.string(),
          text: z.string(),
          options: z.array(z.object({ value: z.string(), label: z.string() }).strict()),
        })
        .strict(),
    ),
  })
  .strict();

export type QuestionsOutput = z.infer<typeof QuestionsOutput>;

export const ScopeOutput = z
  .object({
    sections: z.array(
      z
        .object({
          trade: z.enum([...AI_TRADES, 'not_permitted']),
          sentences: z.array(z.object({ text: z.string(), item_ids: z.array(z.string()) }).strict()),
        })
        .strict(),
    ),
  })
  .strict();

export type ScopeOutput = z.infer<typeof ScopeOutput>;

// ── What's sent to the API for extraction ─────────────────────────────────────
//
// The API can't enforce one object shape per item kind (37 shapes compile to a
// grammar it rejects as too large). So each item's facts travel as name/value
// pairs, and plain code rebuilds the typed item and checks every value against
// the fact schema above. A value the engine doesn't know is a check failure,
// which gets the usual retry.

const ALL_FACTS = [...new Set(Object.values(WORK_ITEM_KINDS).flatMap((f) => Object.keys(f).filter((n) => f[n].type !== 'fixtures')))].sort();

export const ExtractWire = z
  .object({
    work_items: z.array(
      z
        .object({
          kind: z.enum(Object.keys(WORK_ITEM_KINDS) as [string, ...string[]]),
          id: z.string().describe('lower_snake_case, unique in this job, e.g. "island" or "back_door"'),
          label: z.string().describe("Short plain description of this item, in the contractor's words where possible"),
          facts: z
            .array(z.object({ fact: z.enum(ALL_FACTS as [string, ...string[]]), value: z.string() }).strict())
            .describe('Every fact of this kind, once each: its value, or "unknown". Counts as digits ("18"); sizes as written, or "none" when not given'),
          fixtures: z.array(z.object({ fixture: z.enum(FIXTURE_TYPES), count: z.number().int() }).strict()).describe('Only for kinds with fixtures; otherwise empty'),
        })
        .strict(),
    ),
    costs: ExtractOutput.shape.costs,
    performed_by: ExtractOutput.shape.performed_by,
    property: ExtractOutput.shape.property,
    quotes: ExtractOutput.shape.quotes,
    not_covered: ExtractOutput.shape.not_covered,
  })
  .strict();

export type ExtractWire = z.infer<typeof ExtractWire>;

/** Rebuild typed work items from the name/value pairs. Problems are in plain words, for the retry. */
export function fromWire(wire: ExtractWire): { output: ExtractOutput | null; problems: string[] } {
  const problems: string[] = [];
  const defaulted = new Set<string>();
  const items = wire.work_items.map((w) => {
    const specs = WORK_ITEM_KINDS[w.kind];
    const item: Record<string, unknown> = { kind: w.kind, id: w.id, label: w.label };
    const given = new Map<string, string>();
    for (const { fact, value } of w.facts) {
      if (given.has(fact)) problems.push(`Work item "${w.id}": ${fact} is listed twice.`);
      given.set(fact, value);
    }
    for (const [name, spec] of Object.entries(specs)) {
      if (spec.type === 'fixtures') {
        item[name] = w.fixtures;
        continue;
      }
      const v = given.get(name);
      given.delete(name);
      if (spec.type === 'text') {
        item[name] = v === undefined || v === UNKNOWN || v === 'none' || v === '' ? null : v;
        continue;
      }
      if (v === undefined) {
        problems.push(`Work item "${w.id}" (${w.kind}) is missing ${name}; give a value or "unknown".`);
        continue;
      }
      if (spec.type === 'choice' && spec.default !== undefined && v === UNKNOWN) {
        // A fact with a default (drywall material, electrical equipment): not stated means the default,
        // as when the fact is left out of a job file (E-04's "full gut" names no wall material).
        item[name] = spec.default;
        defaulted.add(`${w.id}.${name}`);
        continue;
      }
      if (spec.type === 'count') item[name] = v === UNKNOWN ? UNKNOWN : /^\d+$/.test(v) ? Number(v) : v;
      else item[name] = v;
      const ok = spec.type === 'count' ? v === UNKNOWN || /^\d+$/.test(v) : spec.values.includes(v) || (spec.unknown && v === UNKNOWN);
      if (!ok) {
        const allowed = spec.type === 'count' ? 'a whole number or "unknown"' : [...spec.values, ...(spec.unknown ? [UNKNOWN] : [])].join(', ');
        problems.push(`Work item "${w.id}" (${w.kind}): ${name} "${v}" isn't allowed; use one of: ${allowed}.`);
      }
    }
    for (const extra of given.keys()) problems.push(`Work item "${w.id}" (${w.kind}) has no fact "${extra}"; ${w.kind} facts are: ${Object.keys(specs).join(', ') || 'none'}.`);
    if (!('fixtures' in specs) && w.fixtures.length) problems.push(`Work item "${w.id}" (${w.kind}) can't have fixtures.`);
    return item;
  });
  if (problems.length) return { output: null, problems };
  // The fact now has a value, so a quote kept for asking about it would fail the quote check.
  const quotes = wire.quotes.filter((q) => !defaulted.has(q.key));
  const parsed = ExtractOutput.safeParse({ ...wire, work_items: items, quotes });
  if (!parsed.success) return { output: null, problems: [`The answer doesn't fit the fact schema: ${parsed.error.message}`] };
  return { output: parsed.data, problems: [] };
}

/** The typed answer in the wire shape (for tests, recordings and the dry run). */
export function toWire(out: ExtractOutput): ExtractWire {
  return {
    ...out,
    work_items: (out.work_items as Record<string, unknown>[]).map((item) => {
      const specs = WORK_ITEM_KINDS[item.kind as string];
      return {
        kind: item.kind as string,
        id: item.id as string,
        label: item.label as string,
        facts: Object.entries(specs)
          .filter(([, spec]) => spec.type !== 'fixtures')
          .map(([name, spec]) => ({ fact: name, value: spec.type === 'text' ? ((item[name] as string | null) ?? 'none') : String(item[name]) })),
        fixtures: ((item.fixtures as ExtractWire['work_items'][number]['fixtures']) ?? []),
      };
    }),
  };
}
