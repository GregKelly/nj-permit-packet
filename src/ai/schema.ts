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
