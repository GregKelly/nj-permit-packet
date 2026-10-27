'use server';
// Setup screen: save the business details and the subcontractor directory.

import { redirect } from 'next/navigation';
import type { Address } from '../../src/packet/types';
import { store } from '../lib/app';

const text = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const optional = (f: FormData, k: string) => text(f, k) || undefined;

function address(f: FormData, prefix = ''): Address | undefined {
  const a = { street: text(f, `${prefix}street`), city: text(f, `${prefix}city`), state: text(f, `${prefix}state`) || 'NJ', zip: text(f, `${prefix}zip`) };
  return a.street ? a : undefined;
}

function back(message: string, kind: 'ok' | 'error' = 'error'): never {
  redirect(`/setup?${kind}=${encodeURIComponent(message)}`);
}

export async function saveProfile(f: FormData) {
  const name = text(f, 'name');
  if (!name) back('Enter your business name.');
  store().saveProfile({
    name,
    address: address(f),
    phone: optional(f, 'phone'),
    email: optional(f, 'email'),
    hic_registration: text(f, 'hic_registration') || null,
    fein: optional(f, 'fein'),
    license: optional(f, 'license'),
    license_expires: optional(f, 'license_expires'),
  });
  back('Business details saved.', 'ok');
}

export async function saveSub(f: FormData) {
  const trade = text(f, 'trade');
  if (!['electrical', 'plumbing', 'hvacr'].includes(trade)) back('Pick the trade.');
  const name = text(f, 'name');
  const license = text(f, 'license');
  const expires = text(f, 'expires');
  if (!name || !license || !/^\d{4}-\d{2}-\d{2}$/.test(expires)) back('A subcontractor needs a name, license number and license expiry date.');
  const id = text(f, 'id');
  store().saveSub({
    ...(id ? { id: Number(id) } : {}),
    trade: trade as 'electrical' | 'plumbing' | 'hvacr',
    name,
    license,
    expires,
    address: address(f),
    phone: optional(f, 'phone'),
    email: optional(f, 'email'),
    fein: optional(f, 'fein'),
    usual: f.get('usual') === 'on',
  });
  back(`${name} saved.`, 'ok');
}

export async function deleteSub(f: FormData) {
  store().deleteSub(Number(f.get('id')));
  back('Subcontractor removed.', 'ok');
}
