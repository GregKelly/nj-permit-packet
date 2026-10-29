// Address → matching parcels, from the NJOGIS statewide parcel service (MOD-IV
// tax list attributes). Field meanings: docs/research-notes.md. The contractor
// picks a match and confirms it; nothing here is used unconfirmed.
//
// Only property fields are requested. The record's ZIP_CODE, ST_ADDRESS and
// CITY_STATE are the owner's mailing address, not the work site's, so they're
// never fetched: the work-site ZIP comes from the address the contractor types.

import { parseStreet, sameAddress, searchWord, townName } from './address';

export const PARCEL_SERVICE =
  'https://services2.arcgis.com/XVOqAjTOJ5P6ngMu/arcgis/rest/services/Parcels_Composite_NJ_WM/FeatureServer/0/query';
const FIELDS = ['PROP_LOC', 'MUN_NAME', 'PCLBLOCK', 'PCLLOT', 'PCLQCODE', 'PROP_CLASS', 'YR_CONSTR', 'DWELL'];

export interface ParcelCandidate {
  /** As the tax record writes it, e.g. "34 OAKVIEW AVENUE". */
  address: string;
  /** "Maplewood" (from MUN_NAME "MAPLEWOOD TWP"). */
  municipality: string;
  block: string;
  lot: string;
  qualifier?: string;
  prop_class: string;
  year_built: number | null;
  /** Residential dwelling units in the tax record (DWELL). A check on the home type, never the answer. */
  dwelling_units: number | null;
}

export type ParcelResult =
  | { ok: true; candidates: ParcelCandidate[] }
  | { ok: false; reason: 'no_street' | 'no_number' | 'unavailable'; message: string };

/** Saves service answers so the same street isn't fetched twice (SQLite in the app). */
export interface ParcelCache {
  get(key: string): unknown | undefined;
  set(key: string, value: unknown): void;
}

export interface LookupOptions {
  fetch?: typeof fetch;
  cache?: ParcelCache;
}

const quote = (s: string) => `'${s.replace(/'/g, "''")}'`;

/** The service request for every parcel on a street in a town. */
export function parcelQueryUrl(town: string, word: string): string {
  const townWord = town.toUpperCase().replace(/\b(TOWNSHIP|TWP)\b/g, '').trim();
  const params = new URLSearchParams({
    where: `MUN_NAME LIKE ${quote(`%${townWord}%`)} AND PROP_LOC LIKE ${quote(`%${word}%`)}`,
    outFields: FIELDS.join(','),
    returnGeometry: 'false',
    resultRecordCount: '2000',
    f: 'json',
  });
  return `${PARCEL_SERVICE}?${params}`;
}

function toCandidate(a: Record<string, unknown>): ParcelCandidate {
  const qualifier = String(a.PCLQCODE ?? '').trim();
  return {
    address: String(a.PROP_LOC ?? '').replace(/\s+/g, ' ').trim(),
    municipality: townName(String(a.MUN_NAME ?? '')),
    block: String(a.PCLBLOCK ?? '').trim(),
    lot: String(a.PCLLOT ?? '').trim(),
    ...(qualifier ? { qualifier } : {}),
    prop_class: String(a.PROP_CLASS ?? '').trim(),
    year_built: typeof a.YR_CONSTR === 'number' && a.YR_CONSTR > 0 ? a.YR_CONSTR : null,
    dwelling_units: typeof a.DWELL === 'number' ? a.DWELL : null,
  };
}

/** Parcels in `town` whose address matches `street` ("34 Oakview Ave"), exact numbers first. */
export async function lookupParcel(street: string, town: string, options: LookupOptions = {}): Promise<ParcelResult> {
  const typed = parseStreet(street);
  const word = searchWord(typed);
  if (!word || typed.from === null) {
    return { ok: false, reason: 'no_number', message: 'Enter the house number and street, e.g. "34 Oakview Ave".' };
  }
  const url = parcelQueryUrl(town, word);
  let body = options.cache?.get(url) as { features?: { attributes: Record<string, unknown> }[]; error?: unknown } | undefined;
  if (!body) {
    try {
      const res = await (options.fetch ?? fetch)(url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      body = await res.json();
    } catch (error) {
      return { ok: false, reason: 'unavailable', message: `The state parcel service didn't answer (${(error as Error).message}). Enter block and lot from the tax bill or the town's tax records.` };
    }
    if (!body?.features) {
      return { ok: false, reason: 'unavailable', message: "The state parcel service gave an answer we couldn't read. Enter block and lot from the tax bill or the town's tax records." };
    }
    options.cache?.set(url, body);
  }

  const onStreet = body.features!.map((f) => f.attributes).filter((a) => {
    const p = parseStreet(String(a.PROP_LOC ?? ''));
    return p.name.join(' ') === typed.name.join(' ') && (!typed.suffix || !p.suffix || typed.suffix === p.suffix);
  });
  if (!onStreet.length) {
    return { ok: false, reason: 'no_street', message: `No street matching "${street}" in ${town} in the state parcel data. Check the spelling, or enter block and lot yourself.` };
  }
  const matches = onStreet.filter((a) => sameAddress(typed, parseStreet(String(a.PROP_LOC))));
  if (!matches.length) {
    return { ok: false, reason: 'no_number', message: `The street is in the parcel data, but no property at number ${typed.from}. Check the number, or enter block and lot yourself.` };
  }
  const exact = (a: Record<string, unknown>) => {
    const p = parseStreet(String(a.PROP_LOC));
    return p.from === typed.from && p.to === typed.from ? 0 : 1;
  };
  const candidates = matches
    .sort((a, b) => exact(a) - exact(b) || String(a.PROP_LOC).localeCompare(String(b.PROP_LOC)))
    .map(toCandidate);
  return { ok: true, candidates };
}
