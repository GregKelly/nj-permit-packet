// Prints a test job's determinations in plain language.
// Usage: npm run determine -- J-01            (facts after follow-ups)
//        npm run determine -- J-03 --before   (facts before follow-ups)

import { determine, type Determinations } from '../src/engine';
import { loadRules } from '../src/rules-dir';
import { loadJob, TODAY } from '../tests/helpers';

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
if (!id) {
  console.error('Usage: npm run determine -- <job id, e.g. J-01> [--before]');
  process.exit(1);
}
const before = args.includes('--before');
const job = loadJob(`${id}.yaml`);
const facts = before ? job.before : job.after;
const d: Determinations = determine(facts, loadRules(), TODAY);

const OUTCOME: Record<string, string> = {
  out_of_scope: 'OUT OF SCOPE for v1',
  cannot_classify: "CAN'T CLASSIFY: call the office",
  no_permit: 'NO PERMIT NEEDED (print the one-page explanation)',
  zoning_only: 'NO CONSTRUCTION PERMIT, but a zoning permit applies',
  minor_work: 'MINOR WORK: notify the construction office before work starts; file this packet within 5 business days of the notice',
  permit: 'PERMIT REQUIRED before work starts',
};
const money = (n: number | null | undefined) => (n == null ? '(blank)' : `$${n.toLocaleString('en-US')}`);
const h = (s: string) => console.log(`\n${s}`);

console.log(`${job.id} · ${job.title}  [facts ${before ? 'BEFORE' : 'after'} follow-ups]`);
console.log(`${facts.property.address} · built ${facts.property.year_built} · ${facts.property.dwelling_type} · rules ${d.rules_version} · today ${d.today}`);
console.log(`\nResult: ${OUTCOME[d.outcome]}${d.job_tier ? ` (job tier ${d.job_tier})` : ''}`);

h('Work items');
for (const i of d.items) {
  console.log(`  ${(i.tier ?? '??').padEnd(4)} ${(i.rule_id ?? '—').padEnd(6)} ${i.label}`);
  console.log(`              ${i.error ?? i.reason}${i.citation ? ` (${i.citation})` : ''}`);
  if (i.assumed_unknown.length) console.log(`              ⚠ Not known: ${i.assumed_unknown.join(', ')}. The conservative rule applied; change it if you confirm otherwise.`);
}

if (d.questions.length) {
  h('Follow-up questions (the answer would change what is required)');
  for (const q of d.questions) console.log(`  ? ${q.key}${q.options.length ? `  [${q.options.join(' / ')}]` : ''}`);
}

if (d.forms.length) {
  h('Forms and signers');
  for (const f of d.forms) console.log(`  ${f.form}  ${f.name.padEnd(48)} signed by: ${f.signer ?? 'MISSING'}`);
}
if (d.zoning) {
  h(`Zoning (${d.zoning.rule_id}): ${d.zoning.status.replace(/_/g, ' ')}`);
  console.log(`  ${d.zoning.message}`);
  for (const c of d.zoning.checklist) console.log(`  [ ] ${c}`);
}
if (d.plans) h(`Plans (${d.plans.rule_id}): ${d.plans.message}${d.plans.because.length ? ` Because of ${d.plans.because.join(', ')}.` : ''}`);
if (d.tips.length) {
  h('Tips (non-blocking)');
  for (const t of d.tips) console.log(`  ${t.id}  ${t.text}`);
}
h(d.flags.length ? `Flags${d.print_blocked ? ' (PRINTING BLOCKED)' : ''}` : 'Flags: none');
for (const f of d.flags) console.log(`  ${f.blocks_printing ? '✖' : '!'} ${f.id}  ${f.message}`);

if (Object.keys(d.form_entries).length) {
  h('What goes on the forms (fee boxes left blank)');
  for (const [form, e] of Object.entries(d.form_entries)) {
    const parts: string[] = [`use group ${e.use_group}`];
    if (e.proposed_work) parts.push(`proposed work: ${e.proposed_work}`);
    if (e.cost_by_subcode) parts.push(Object.entries(e.cost_by_subcode).map(([k, v]) => `${k} ${money(v)}`).join(', ') + `, Total ${money(e.total_cost)}`);
    if (e.type_of_work) parts.push(`type of work: ${e.type_of_work.join(' + ')}, rehabilitation ${money(e.rehabilitation_cost)}`);
    if ('est_cost' in e) parts.push(`est. cost ${money(e.est_cost)}`);
    if (e.heating_system !== undefined) parts.push(`heating system: ${e.heating_system ? `${e.heating_system.work}, ${e.heating_system.distribution}, fuel ${e.heating_system.fuel ?? '(blank)'}` : '(blank)'}`);
    console.log(`  ${form}  ${parts.join(' · ')}`);
    for (const l of e.lines ?? []) {
      console.log(`          ${l.line}${l.label ? ` "${l.label}"` : ''}${l.marker ? ` (${l.marker})` : ''}: ${l.count ?? '(blank)'}${'size' in l ? `, size ${l.size ?? '(blank)'}` : ''}`);
    }
  }
}
if (d.fill_ins.length) {
  h('Cover checklist: left for subs to fill in');
  for (const f of d.fill_ins) console.log(`  [ ] ${f.signer ?? f.form}: fill in ${f.details.join(', ')} on ${f.form}`);
}
if (d.assumptions_applied.length) {
  h('Assumptions this rests on');
  for (const a of d.assumptions_applied) console.log(`  ${a.id.padEnd(5)} ${a.text}`);
}
if (d.office_questions.length) {
  h('Open questions for the construction office');
  for (const q of d.office_questions) console.log(`  ${q.id.padEnd(5)} ${q.text}`);
}
