// The parcel lookup (M4 plan, "Tests" 3), on answers saved from the real service
// by `npm run parcel -- "<address>" Maplewood --save tests/parcel/<name>.json`.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseStreet, townName } from '../src/parcel/address';
import { lookupParcel, parcelQueryUrl, type ParcelCache } from '../src/parcel/lookup';
import { unitsMismatch } from '../src/parcel/units';

const saved = (name: string) => JSON.parse(readFileSync(new URL(`./parcel/${name}.json`, import.meta.url), 'utf8'));

/** A fetch that answers with one saved response and counts calls. */
function fakeFetch(body: unknown) {
  const calls: string[] = [];
  const f = (async (url: string) => {
    calls.push(String(url));
    return new Response(JSON.stringify(body), { status: 200 });
  }) as unknown as typeof fetch;
  return { f, calls };
}

describe('addresses as typed and as the tax records write them', () => {
  it.each([
    ['34 Oakview Ave', { from: 34, to: 34, unit: null, name: ['OAKVIEW'], suffix: 'AVENUE' }],
    ['34 OAKVIEW AVENUE', { from: 34, to: 34, unit: null, name: ['OAKVIEW'], suffix: 'AVENUE' }],
    ['489-91 VALLEY ST + REAR', { from: 489, to: 491, unit: null, name: ['VALLEY'], suffix: 'STREET' }],
    ['1653-55 SPRINGFIELD AVE', { from: 1653, to: 1655, unit: null, name: ['SPRINGFIELD'], suffix: 'AVENUE' }],
    ['535-543 VALLEY STREET', { from: 535, to: 543, unit: null, name: ['VALLEY'], suffix: 'STREET' }],
    ['57-A NEWARK WAY', { from: 57, to: 57, unit: 'A', name: ['NEWARK'], suffix: 'WAY' }],
    ['57A Newark Way', { from: 57, to: 57, unit: 'A', name: ['NEWARK'], suffix: 'WAY' }],
    ['12 S. Orange Ave.', { from: 12, to: 12, unit: null, name: ['SOUTH', 'ORANGE'], suffix: 'AVENUE' }],
    ['44 Dunnell Raod', { from: 44, to: 44, unit: null, name: ['DUNNELL'], suffix: 'ROAD' }],
  ])('%s', (text, want) => {
    expect(parseStreet(text)).toEqual(want);
  });

  it('town names: "MAPLEWOOD TWP" → Maplewood', () => {
    expect(townName('MAPLEWOOD TWP')).toBe('Maplewood');
    expect(townName('ATLANTIC CITY CITY')).toBe('Atlantic City');
  });
});

describe('lookup', () => {
  it('34 Oakview Ave: one match, with block, lot, class, year built and unit count', async () => {
    const { f } = fakeFetch(saved('oakview'));
    const r = await lookupParcel('34 Oakview Ave', 'Maplewood', { fetch: f });
    expect(r).toEqual({
      ok: true,
      candidates: [{ address: '34 OAKVIEW AVENUE', municipality: 'Maplewood', block: '23.03', lot: '213', prop_class: '2', year_built: 1910, dwelling_units: 1 }],
    });
  });

  it('21 Nelson Place: the tax record lists 4 dwelling units', async () => {
    const r = await lookupParcel('21 Nelson Pl', 'Maplewood', { fetch: fakeFetch(saved('nelson')).f });
    expect(r.ok && r.candidates.map((c) => [c.block, c.lot, c.dwelling_units])).toEqual([['45.03', '126', 4]]);
  });

  it('a number inside a range ("490" finds "489-91 VALLEY ST + REAR"), and an abbreviated suffix in the data', async () => {
    const r = await lookupParcel('490 Valley Street', 'Maplewood', { fetch: fakeFetch(saved('valley')).f });
    expect(r.ok && r.candidates.map((c) => c.address)).toEqual(['489-91 VALLEY ST + REAR']);
    const s = await lookupParcel('1654 Springfield Avenue', 'Maplewood', { fetch: fakeFetch(saved('springfield')).f });
    expect(s.ok && s.candidates.map((c) => [c.address, c.block, c.lot])).toEqual([['1653-55 SPRINGFIELD AVE', '47.04', '162']]);
  });

  it('a unit letter picks that unit; no letter lists every unit at the number', async () => {
    const one = await lookupParcel('57A Newark Way', 'Maplewood', { fetch: fakeFetch(saved('newark')).f });
    expect(one.ok && one.candidates.map((c) => c.address)).toEqual(['57-A NEWARK WAY']);
    const all = await lookupParcel('57 Newark Way', 'Maplewood', { fetch: fakeFetch(saved('newark')).f });
    expect(all.ok && all.candidates.length).toBeGreaterThan(1);
    expect(all.ok && all.candidates.every((c) => c.address.startsWith('57'))).toBe(true);
  });

  it('no such number, no such street, no number typed', async () => {
    const body = saved('oakview');
    expect(await lookupParcel('9999 Oakview Ave', 'Maplewood', { fetch: fakeFetch(body).f })).toMatchObject({ ok: false, reason: 'no_number' });
    expect(await lookupParcel('34 Oakview Terrace', 'Maplewood', { fetch: fakeFetch(body).f })).toMatchObject({ ok: false, reason: 'no_street' });
    expect(await lookupParcel('Oakview Ave', 'Maplewood', { fetch: fakeFetch(body).f })).toMatchObject({ ok: false, reason: 'no_number' });
  });

  it('the service down: a plain message, and block and lot are entered by hand', async () => {
    const down = (async () => {
      throw new Error('getaddrinfo ENOTFOUND');
    }) as unknown as typeof fetch;
    const r = await lookupParcel('34 Oakview Ave', 'Maplewood', { fetch: down });
    expect(r).toMatchObject({ ok: false, reason: 'unavailable' });
    expect(!r.ok && r.message).toMatch(/Enter block and lot/);
  });

  it('a street is fetched once, then answered from the cache', async () => {
    const store = new Map<string, unknown>();
    const cache: ParcelCache = { get: (k) => store.get(k), set: (k, v) => void store.set(k, v) };
    const { f, calls } = fakeFetch(saved('oakview'));
    await lookupParcel('34 Oakview Ave', 'Maplewood', { fetch: f, cache });
    await lookupParcel('36 Oakview Ave', 'Maplewood', { fetch: f, cache });
    expect(calls.length).toBe(1);
  });

  it("never asks for the owner's name or mailing address (the record's ZIP is the owner's, not the site's)", () => {
    const url = decodeURIComponent(parcelQueryUrl('Maplewood', 'OAKVIEW'));
    for (const field of ['OWNER_NAME', 'ST_ADDRESS', 'CITY_STATE', 'ZIP_CODE', 'ZIP5']) expect(url).not.toContain(field);
  });

  it("a street name with an apostrophe can't break the search", () => {
    expect(decodeURIComponent(parcelQueryUrl('Maplewood', "O'NEIL")).replace(/\+/g, ' ')).toContain("PROP_LOC LIKE '%O''NEIL%'");
  });
});

describe('home type against the tax record', () => {
  it.each([
    ['detached_1f', 1, false],
    ['attached', 1, false],
    ['attached', 2, false],
    ['detached_2f', 2, false],
    ['detached_1f', 2, true],
    ['detached_2f', 4, true],
    ['three_or_more_units', 4, false],
    ['three_or_more_units', 1, true],
    ['detached_1f', null, false],
  ] as const)('%s with %s unit(s): note %s', (type, units, note) => {
    expect(unitsMismatch(type, units) !== null).toBe(note);
  });
});
