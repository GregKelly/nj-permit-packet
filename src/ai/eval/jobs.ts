// Shared by the eval command and the offline tests: turning an extraction into a
// test job's facts, and the answer key written as if the AI had produced it.

import { UNKNOWN, WORK_ITEM_KINDS } from '../../engine/facts';
import type { DirectoryEntry, ExtractedJob } from '../extract';
import type { ExtractOutput } from '../schema';
import type { Raw } from './score';

/** Facts about the property that come from the parcel lookup and the contractor, not the description. */
const SUPPLIED = ['municipality', 'address', 'prop_class', 'year_built', 'dwelling_type'];

/** A test job's raw facts with everything description-based taken from the extraction. */
export function jobFromExtraction(fixture: Raw, ex: ExtractedJob): Raw {
  const property = Object.fromEntries(Object.entries(fixture.property).filter(([k]) => SUPPLIED.includes(k)));
  return {
    property: { ...ex.raw.property, ...property },
    costs: ex.raw.costs,
    performed_by: ex.raw.performed_by,
    team: ex.raw.team,
    work_items: ex.raw.work_items,
  };
}

/** For an eval-only description: a Maplewood property with only what the description stated. */
export function evalOnlyJob(ex: ExtractedJob): Raw {
  return {
    property: { municipality: 'Maplewood', address: 'Eval only', prop_class: '2', year_built: 1950, ...ex.raw.property },
    costs: ex.raw.costs,
    performed_by: ex.raw.performed_by,
    team: ex.raw.team,
    work_items: ex.raw.work_items,
  };
}

/**
 * The answer key (a test job's facts before follow-ups) in the AI's output shape.
 * Used to check the eval itself: a perfect extraction must score perfectly.
 */
export function answerKeyAsOutput(fixture: Raw, directory: DirectoryEntry[]): ExtractOutput {
  const work_items = fixture.work_items.map((item: Raw) => {
    const out: Raw = { kind: item.kind, id: item.id, label: item.label };
    for (const [name, spec] of Object.entries(WORK_ITEM_KINDS[item.kind])) {
      const v = item[name];
      if (spec.type === 'fixtures') out[name] = Object.entries(v ?? {}).map(([fixture, count]) => ({ fixture, count }));
      else if (spec.type === 'text') out[name] = v ?? null;
      else if (spec.type === 'choice' && !spec.unknown) out[name] = v ?? spec.default;
      else out[name] = v ?? UNKNOWN;
    }
    return out;
  });
  const costs = Object.fromEntries(['total', 'building', 'electrical', 'plumbing', 'mechanical'].map((k) => [k, fixture.costs?.[k] ?? null]));
  const teamTrade: Raw = { electrical: 'electrical', plumbing: 'plumbing', mechanical: 'hvacr' };
  const performed_by = Object.fromEntries(
    ['building', 'electrical', 'plumbing', 'mechanical'].map((trade) => {
      const p = fixture.performed_by?.[trade];
      const pick = fixture.team?.[teamTrade[trade]];
      if (p === 'owner') return [trade, { who: 'owner', name: null, owner_item_ids: [] }];
      if (p && typeof p === 'object') return [trade, { who: 'owner', name: null, owner_item_ids: p.owner }];
      if (pick) return [trade, { who: 'named', name: directory.find((e) => e.key === pick)!.name, owner_item_ids: [] }];
      return [trade, { who: 'not_mentioned', name: null, owner_item_ids: [] }];
    }),
  );
  const property = {
    dwelling_type: UNKNOWN,
    owner_occupied: fixture.property.owner_occupied ?? UNKNOWN,
    own_sewer: fixture.property.own_sewer ?? UNKNOWN,
  };
  return { work_items, costs, performed_by, property, quotes: [], not_covered: [] } as unknown as ExtractOutput;
}
