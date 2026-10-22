// The fact list: the contract between the AI (which extracts facts) and the
// rules engine (which decides). Design doc §4.1.
//
// Every fact is defined once here as a FactSpec. The same specs build the Zod
// schema (validates AI output and fixtures), tell the rule checker which facts
// and values a rule may mention, and tell question selection which values to try.

import { z } from 'zod';

export const UNKNOWN = 'unknown';

export type FactSpec =
  /** One of a fixed set of values. `unknown` allowed (and the default) when `unknown` is true. */
  | { type: 'choice'; values: readonly string[]; unknown: boolean; default?: string }
  /** A whole number, or `unknown` (the default). */
  | { type: 'count' }
  /** Fixture type → how many this item installs, e.g. { sink: 1, dishwasher: 1 }. */
  | { type: 'fixtures' }
  /** Free text detail, optional (e.g. a size the contractor gave). Never used by rules. */
  | { type: 'text' };

const choice = (...values: string[]): FactSpec => ({ type: 'choice', values, unknown: true });
const fixed = (...values: string[]): FactSpec => ({ type: 'choice', values, unknown: false });
const withDefault = (def: string, ...values: string[]): FactSpec => ({ type: 'choice', values, unknown: false, default: def });
const yesNo = choice('yes', 'no');
const count: FactSpec = { type: 'count' };
const fixtures: FactSpec = { type: 'fixtures' };
const text: FactSpec = { type: 'text' };

export const FIXTURE_TYPES = [
  'water_closet', 'lavatory', 'sink', 'bathtub', 'shower', 'dishwasher', 'disposal',
  'washing_machine', 'floor_drain', 'hose_bibb',
] as const;

const FUELS = ['gas', 'oil', 'propane', 'electric', 'none'];
const OUTDOOR_UNITS = ['ac_condenser', 'heat_pump', 'mini_split'];

/**
 * Work item kinds and their facts. Each work item is classified on its own
 * (rules table §1 step 2). Every item also has an `id` and a `label`.
 */
export const WORK_ITEM_KINDS: Record<string, Record<string, FactSpec>> = {
  // Finishes and walls
  finishes: { element: fixed('cabinets', 'vanity', 'countertops', 'bath_accessories', 'flooring', 'paint', 'wallpaper', 'trim', 'wall_tile') },
  drywall: { material: withDefault('drywall', 'drywall', 'plaster', 'paneling'), extent: choice('under_25_percent', '25_percent_or_more') },
  partitions: {},
  wall_change: { action: fixed('remove', 'move'), bearing: yesNo },
  opening: { opening: fixed('window', 'exterior_door', 'interior_door'), action: choice('replace_same', 'new', 'enlarge') },
  egress_window: {},
  lead_abatement: {},

  // Plumbing and gas
  fixture: { fixtures, action: choice('replace_same', 'add', 'relocate'), upsizing_needed: yesNo },
  faucet_valve: {},
  piping: { like_capacity: yesNo },
  new_bathroom: { fixtures, ejector_pump: yesNo, upsizing_needed: yesNo },
  gas_line: {},

  // Electrical and appliances
  electrical: {
    action: choice('replace_same', 'add'),
    devices: count, // receptacles, switches and light fixtures this item installs
    new_circuit: choice('none', 'appliance', 'other'), // appliance = range, oven, dryer or A/C only
    equipment: withDefault('none', 'none', 'radiant_floor_heat', 'other'),
    kw: text,
  },
  service_change: {},
  appliance: {
    appliance: fixed('range', 'oven', 'cooktop', 'dryer'),
    fuel: choice('gas', 'electric'),
    fuel_change: yesNo,
    gas_line_change: yesNo, // new, moved or resized gas piping
    electrical_change: yesNo,
    kw: text,
  },
  range_hood: { action: choice('replace', 'new'), cfm: count, cfm_increase: yesNo },
  exhaust_fan: { action: choice('replace', 'new'), vents_outdoors: yesNo, cuts_framing: yesNo },
  smoke_co_alarm: { power: choice('hardwired', 'battery', 'plug_in'), count },

  // Basement
  habitable_space: { bedroom: yesNo, fuel_appliance_nearby: yesNo },
  insulation: { type: choice('non_foam', 'foam') },

  // Roof and exterior
  roof_covering: { existing_layers: choice('one', 'two_or_more') },
  roof_decking: { rafters_touched: yesNo },
  roof_structure: {},
  skylight: { count },
  roof_shape_change: {},
  gutters: {},
  siding: { material: choice('polypropylene', 'other') },

  // HVAC
  hvac_equipment: {
    equipment: fixed('furnace', 'boiler', ...OUTDOOR_UNITS),
    action: choice('replace', 'new'),
    like_capacity: yesNo,
    fuel_change: yesNo,
    fuel: choice(...FUELS), // the fuel after the work
    same_location: yesNo,
    cuts_framing: yesNo, // line-set and vent holes don't count (HV-03)
    kw: text,
  },
  water_heater: { action: choice('replace', 'new'), like_capacity: yesNo, fuel_change: yesNo, fuel: choice(...FUELS) },
  ductwork: { action: choice('repair_replace', 'extend'), fuel: choice(...FUELS) },
  hvac_component: { component: fixed('thermostat', 'controls', 'motor', 'pump', 'fan', 'ac_repair') },
  hydronic_piping: { action: choice('repair_replace', 'rearrange') },
  chimney_vent: { action: choice('new', 'modify', 'direct_vent_conversion', 'liquid_liner'), new_penetration: yesNo },
};

/** Property facts the rules may use (as `property.<fact>` in conditions). */
export const PROPERTY_FACTS: Record<string, FactSpec> = {
  municipality: text,
  prop_class: text,
  year_built: count,
  dwelling_type: choice('detached_1f', 'detached_2f', 'attached', 'three_or_more_units', 'non_residential'),
};

export const TRADES = ['building', 'electrical', 'plumbing', 'mechanical'] as const;
export type Trade = (typeof TRADES)[number];

function factSchema(spec: FactSpec): z.ZodTypeAny {
  switch (spec.type) {
    case 'choice': {
      const values = (spec.unknown ? [...spec.values, UNKNOWN] : [...spec.values]) as [string, ...string[]];
      const base = z.enum(values);
      if (spec.unknown) return base.default(UNKNOWN);
      return spec.default ? base.default(spec.default) : base;
    }
    case 'count':
      return z.union([z.number().int().nonnegative(), z.literal(UNKNOWN)]).default(UNKNOWN);
    case 'fixtures':
      return z.record(z.enum(FIXTURE_TYPES), z.number().int().positive());
    case 'text':
      return z.string().optional();
  }
}

const itemSchemas = Object.entries(WORK_ITEM_KINDS).map(([kind, facts]) =>
  z
    .object({
      id: z.string().regex(/^[a-z][a-z0-9_]*$/, 'item ids are lower_snake_case'),
      kind: z.literal(kind),
      label: z.string().min(1),
      ...Object.fromEntries(Object.entries(facts).map(([name, spec]) => [name, factSchema(spec)])),
    })
    .strict(),
);

export const WorkItemSchema = z.discriminatedUnion(
  'kind',
  itemSchemas as unknown as [z.ZodDiscriminatedUnionOption<'kind'>, ...z.ZodDiscriminatedUnionOption<'kind'>[]],
);

const money = z.number().nonnegative().nullable().default(null);

const SubcontractorSchema = z.object({
  name: z.string(),
  license: z.string(),
  expires: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dates are YYYY-MM-DD'),
});

export const JobFactsSchema = z
  .object({
    property: z
      .object({
        municipality: z.string(),
        address: z.string(),
        block: z.string().optional(),
        lot: z.string().optional(),
        qualifier: z.string().optional(),
        prop_class: z.string(),
        year_built: factSchema(PROPERTY_FACTS.year_built),
        dwelling_type: factSchema(PROPERTY_FACTS.dwelling_type),
      })
      .strict(),
    /** Contract value by trade, in dollars. null = not stated. */
    costs: z
      .object({ total: money, building: money, electrical: money, plumbing: money, mechanical: money })
      .strict()
      .default({}),
    /** Who does the trade work. The homeowner-exempt path is out of scope (LC-05). */
    performed_by: z.enum(['contractor', 'owner']).default('contractor'),
    /** From the contractor profile and subcontractor directory. */
    team: z
      .object({
        applicant: z.object({ name: z.string(), hic_registration: z.string().nullable() }).strict(),
        electrical: SubcontractorSchema.optional(),
        plumbing: SubcontractorSchema.optional(),
        hvacr: SubcontractorSchema.optional(),
      })
      .strict(),
    work_items: z.array(WorkItemSchema),
  })
  .strict()
  .superRefine((job, ctx) => {
    const seen = new Set<string>();
    for (const item of job.work_items as { id: string }[]) {
      if (seen.has(item.id)) ctx.addIssue({ code: 'custom', message: `duplicate work item id "${item.id}"` });
      seen.add(item.id);
    }
  });

/** A work item as the engine sees it: id, kind, label and that kind's facts. */
export type WorkItem = { id: string; kind: string; label: string; [fact: string]: unknown };

export type JobFacts = Omit<z.infer<typeof JobFactsSchema>, 'work_items'> & { work_items: WorkItem[] };

/** Validate and fill defaults (unstated facts become `unknown`). Throws on invalid input. */
export function parseJobFacts(input: unknown): JobFacts {
  return JobFactsSchema.parse(input) as JobFacts;
}
