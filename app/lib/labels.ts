// Plain words for the facts editor and the determinations. Fact and value wording
// comes from src/ai/meanings.ts (the same words the questions use); kinds are named here.

import { meaningFor } from '../../src/ai/meanings';
import { UNKNOWN } from '../../src/engine/facts';

export const KIND_LABELS: Record<string, string> = {
  finishes: 'Finishes (cabinets, counters, flooring, paint, tile…)',
  drywall: 'Drywall, plaster or paneling',
  partitions: 'New non-bearing walls (framing, drywall, ceiling)',
  wall_change: 'Remove or move a wall',
  opening: 'Window or door',
  egress_window: 'Basement egress window (foundation cut)',
  lead_abatement: 'Lead abatement',
  fixture: 'Plumbing fixtures (sinks, toilets, tubs, dishwasher…)',
  faucet_valve: 'Faucets and shower valves',
  piping: 'Replace water or drain piping',
  new_bathroom: 'New bathroom where there was none',
  gas_line: 'New or moved gas piping',
  electrical: 'Outlets, switches, lights, circuits',
  service_change: 'New or upgraded electrical service or panel',
  appliance: 'Range, oven, cooktop or dryer',
  range_hood: 'Range hood',
  exhaust_fan: 'Bath exhaust fan',
  smoke_co_alarm: 'Smoke and CO alarms',
  habitable_space: 'Finish unfinished space as a room',
  insulation: 'Insulation',
  roof_covering: 'Roofing (shingles, underlayment)',
  roof_decking: 'Roof sheathing',
  roof_structure: 'Rafters, joists, ridge',
  skylight: 'Skylights',
  roof_shape_change: 'Roof shape, pitch or height change, or dormer',
  gutters: 'Gutters and leaders',
  siding: 'Siding',
  hvac_equipment: 'Furnace, boiler, A/C, heat pump or mini-split',
  water_heater: 'Water heater',
  ductwork: 'Ductwork',
  hvac_component: 'HVAC part (thermostat, controls, motor…)',
  hydronic_piping: 'Heating pipes or radiators',
  chimney_vent: 'Chimney or vent',
};

export const TRADE_LABELS: Record<string, string> = {
  total: 'Whole job',
  building: 'Building',
  electrical: 'Electrical',
  plumbing: 'Plumbing and gas',
  mechanical: 'HVAC (mechanical)',
  hvacr: 'HVACR',
};

export const humanize = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** What a fact is about, as a short label. */
export function factLabel(kind: string | null, fact: string): string {
  const asks = meaningFor(kind, fact)?.asks;
  return asks ?? humanize(fact);
}

export function valueLabel(kind: string | null, fact: string, value: string): string {
  if (value === UNKNOWN) return "Don't know";
  return meaningFor(kind, fact)?.values?.[value] ?? humanize(value);
}
