// Builds a test job's packet, ready to print.
// Usage: npm run packet -- J-01                  (writes out/J-01.pdf)
//        npm run packet -- J-08 --hvacr clearair (swap a subcontractor)
//        npm run packet -- J-01 --narrative      (add the scope narrative saved by `npm run scope -- J-01`)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildPacket } from '../src/packet/build';
import { loadRules } from '../src/rules-dir';
import { TODAY } from '../tests/helpers';
import { loadPacketJob, packetProfile } from '../tests/packet-helpers';

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--') && !['--electrical', '--plumbing', '--hvacr'].includes(args[args.indexOf(a) - 1]));
if (!id) {
  console.error('Usage: npm run packet -- <job id, e.g. J-01> [--electrical|--plumbing|--hvacr <sub key>]');
  process.exit(1);
}
const team: Record<string, string> = {};
for (const trade of ['electrical', 'plumbing', 'hvacr']) {
  const i = args.indexOf(`--${trade}`);
  if (i >= 0) team[trade] = args[i + 1];
}

const f = loadPacketJob(id, loadRules(), Object.keys(team).length ? team : undefined);
if (args.includes('--narrative')) {
  const saved = `out/${id}.scope.json`;
  if (!existsSync(saved)) {
    console.error(`No saved narrative at ${saved}. Run \`npm run scope -- ${id}\` first.`);
    process.exit(1);
  }
  f.job.scope_narrative = JSON.parse(readFileSync(saved, 'utf8')).paragraphs;
}
const result = await buildPacket(f.job, f.d, packetProfile, TODAY);
if (result.kind === 'none') {
  console.log(`${id}: no packet. ${result.reason}`);
  process.exit(0);
}
mkdirSync('out', { recursive: true });
const file = `out/${id}${Object.values(team).map((t) => `-${t}`).join('')}.pdf`;
writeFileSync(file, result.pdf);
console.log(`Wrote ${file} (${result.kind === 'packet' ? 'permit packet' : '"no permit needed" sheet'})`);
for (const p of result.pages) console.log(`  page ${String(p.start).padStart(2)}${p.pages > 1 ? `-${p.start + p.pages - 1}` : ''}  ${p.form ?? p.part.replace('_', ' ')}`);
for (const flag of f.d.flags) console.log(`  ! ${flag.id}: ${flag.message}`);
