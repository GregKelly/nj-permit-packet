'use server';
// Setup screen: save the business details and the subcontractor directory.

import { redirect } from 'next/navigation';
import { isZip, PHONE_HINT, tidyFein, tidyPhone } from '../../src/jobs/contact';
import type { Address } from '../../src/packet/types';
import { store } from '../lib/app';

const text = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const optional = (f: FormData, k: string) => text(f, k) || undefined;

function address(f: FormData, prefix = ''): Address | undefined {
  const a = { street: text(f, `${prefix}street`), city: text(f, `${prefix}city`), state: text(f, `${prefix}state`) || 'NJ', zip: text(f, `${prefix}zip`) };
  if (a.zip && !isZip(a.zip)) back('Enter the ZIP code as 5 digits.');
  return a.street ? a : undefined;
}

/** The phone and FEIN, checked and written one way; blank stays blank. */
function contact(f: FormData) {
  const phone = optional(f, 'phone');
  const fein = optional(f, 'fein');
  if (phone && !tidyPhone(phone)) back(`Enter the phone as ${PHONE_HINT}.`);
  if (fein && !tidyFein(fein)) back('Enter the FEIN as 9 digits, like 12-3456789.');
  return { phone: phone && tidyPhone(phone)!, fein: fein && tidyFein(fein)! };
}

function back(message: string, kind: 'ok' | 'error' = 'error'): never {
  redirect(`/setup?${kind}=${encodeURIComponent(message)}`);
}

export async function saveProfile(f: FormData) {
  const name = text(f, 'name');
  if (!name) back('Enter your business name.');
  const { phone, fein } = contact(f);
  store().saveProfile({
    name,
    address: address(f),
    phone,
    email: optional(f, 'email'),
    hic_registration: text(f, 'hic_registration') || null,
    fein,
    license: optional(f, 'license'),
    license_expires: optional(f, 'license_expires'),
  });
  back('Business details saved. Next, add your subcontractors below.', 'ok');
}

export async function saveSub(f: FormData) {
  const trade = text(f, 'trade');
  if (!['electrical', 'plumbing', 'hvacr'].includes(trade)) back('Pick the trade.');
  const name = text(f, 'name');
  const license = text(f, 'license');
  const expires = text(f, 'expires');
  if (!name || !license || !/^\d{4}-\d{2}-\d{2}$/.test(expires)) back('A subcontractor needs a name, license number and license expiry date.');
  const id = text(f, 'id');
  const { phone, fein } = contact(f);
  store().saveSub({
    ...(id ? { id: Number(id) } : {}),
    trade: trade as 'electrical' | 'plumbing' | 'hvacr',
    name,
    license,
    expires,
    address: address(f),
    phone,
    email: optional(f, 'email'),
    fein,
    usual: f.get('usual') === 'on',
  });
  back(`${name} saved. Add another subcontractor below, or start a job.`, 'ok');
}

/** One of your own trade licenses: your business signs that trade's section. Name and contact details come from your business. */
export async function saveOwnLicense(f: FormData) {
  if (!store().getProfile()) back('Save your business details first.');
  const trade = text(f, 'trade');
  if (!['electrical', 'plumbing', 'hvacr'].includes(trade)) back('Pick the trade.');
  const license = text(f, 'license');
  const expires = text(f, 'expires');
  if (!license || !/^\d{4}-\d{2}-\d{2}$/.test(expires)) back('A trade license needs a license number and expiry date.');
  const id = text(f, 'id');
  store().saveSub({
    ...(id ? { id: Number(id) } : {}),
    self: true,
    trade: trade as 'electrical' | 'plumbing' | 'hvacr',
    license,
    expires,
    usual: f.get('usual') === 'on',
  });
  back('Your trade license is saved. Your business can now sign that section.', 'ok');
}

export async function deleteSub(f: FormData) {
  store().deleteSub(Number(f.get('id')));
  back('Removed.', 'ok');
}
