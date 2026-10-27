// Looks up an address in the state parcel data, as the Describe screen does.
// Usage: npm run parcel -- "34 Oakview Ave" Maplewood
//        npm run parcel -- "34 Oakview Ave" Maplewood --save tests/parcel/oakview.json   (save the service's answer for tests)

import { writeFileSync } from 'node:fs';
import { lookupParcel } from '../src/parcel/lookup';

const args = process.argv.slice(2);
const save = args.includes('--save') ? args[args.indexOf('--save') + 1] : null;
const [street, town = 'Maplewood'] = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--save');
if (!street) {
  console.error('Usage: npm run parcel -- "<number and street>" [town] [--save <file>]');
  process.exit(1);
}
const r = await lookupParcel(street, town, {
  cache: { get: () => undefined, set: (_key, body) => save && writeFileSync(save, JSON.stringify(body, null, 1) + '\n') },
});
if (!r.ok) {
  console.log(r.message);
  process.exit(0);
}
for (const c of r.candidates) {
  console.log(`${c.address}, ${c.municipality}: block ${c.block}, lot ${c.lot}${c.qualifier ? `, qualifier ${c.qualifier}` : ''} · class ${c.prop_class} · built ${c.year_built ?? '?'} · ${c.dwelling_units ?? '?'} dwelling unit(s)`);
}
if (save) console.log(`Saved the service's answer to ${save}`);
