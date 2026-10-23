// Renders the YAML rule files back into a readable table: docs/rules-reference.md.
// Usage: npm run render-rules

import { writeFileSync } from 'node:fs';
import type { Cond, CondValue, ItemRule, RefRule, ThenPart, When } from '../src/engine/load';
import { loadRules } from '../src/rules-dir';

const OUT = new URL('../docs/rules-reference.md', import.meta.url).pathname;
const rules = loadRules();

const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
const list = (ids: string[]) => ids.join(', ');

function value(v: CondValue): string {
  const one = (x: unknown) => {
    if (x && typeof x === 'object') {
      const [op, n] = Object.entries(x)[0];
      return `${{ lt: '<', lte: '≤', gt: '>', gte: '≥' }[op]} ${n}`;
    }
    return String(x);
  };
  return Array.isArray(v) ? v.map(one).join(' or ') : one(v);
}

function cond(c: Cond): string {
  const parts: string[] = [];
  if ('kind' in c) parts.push(`**${value(c.kind)}**`);
  for (const [k, v] of Object.entries(c)) if (k !== 'kind') parts.push(`${k}: ${value(v)}`);
  return parts.join(', ');
}

const when = (w: When) => (Array.isArray(w) ? w.map(cond).join('<br>*or* ') : cond(w));

function outcome(t: ThenPart): string {
  const forms = t.forms.length ? ` · ${t.forms.join(' + ')}` : '';
  return `**${t.tier}**${forms}${t.stop ? ' · stop' : ''}`;
}

function itemRow(r: ItemRule | RefRule): string {
  if ('refers_to' in r) {
    return `| ${r.id} | ${esc(r.title)} | *Covered by ${list(r.refers_to)}* | | ${esc(r.notes ?? '')} |`;
  }
  const result = r.then
    ? outcome(r.then)
    : r.cases!.map((c) => `${c.when ? `if ${when(c.when)}: ` : 'otherwise: '}${outcome(c.then)}`).join('<br>');
  const refs = [...r.assumptions, ...(r.cases ?? []).flatMap((c) => c.assumptions), ...r.office_questions];
  const notes = [r.reason, r.citation && `*${r.citation}*`, r.notes, refs.length && `⚠️ ${list([...new Set(refs)])}`].filter(Boolean).join('<br>');
  return `| ${r.id} | ${esc(r.title)} | ${when(r.when)} | ${result} | ${esc(notes)} |`;
}

const out: string[] = [];
const push = (...lines: string[]) => out.push(...lines);

push(
  '# Rules reference',
  '',
  `*Generated from \`rules/\` by \`npm run render-rules\`. Don't edit this file; edit the YAML and regenerate. Rules version \`${rules.version}\`.*`,
  '',
  'This is the rule data the engine runs, in table form. The approved original is [rules-table-v1.md](rules-table-v1.md); the YAML is the source of truth from M1 on (design doc §4.2).',
  '',
  '**How to read the "Applies when" column.** **Bold** is the work item kind; the rest are facts about that item (see `src/engine/facts.ts`). "or" between values means any of them. *or* between lines means any of those conditions. `unknown` in a list is how a rule takes the conservative branch when a fact isn\'t known. Within the item rules, the first rule that matches wins, in the order shown.',
  '',
  '**Tiers.** OM = ordinary maintenance (no permit). MW = minor work (notice before starting, file within 5 business days). FULL = permit before work starts.',
  '',
  '## 1. Scope check',
  '',
  '| ID | Rule | Must be true | Otherwise |',
  '|---|---|---|---|',
  ...rules.scope.map((s) => `| ${s.id} | ${esc(s.title)} | ${cond(s.property)} | ${esc(s.message)} |`),
  '',
  '## 2. Rules by project type',
);

let n = 1;
for (const g of rules.groups) {
  push('', `### 2.${n++} ${g.title} (${g.group})`, '', `*${g.file}*`, '', '| ID | Rule | Applies when | Result | Reason / citation / notes |', '|---|---|---|---|---|');
  push(...g.entries.map(itemRow));
}

push(
  '',
  '## 3. Zoning prior approval (Maplewood)',
  '',
  `Config flags (\`municipal/maplewood/config.yaml\`): ${Object.entries(rules.config.flags).map(([k, v]) => `\`${k}: ${v}\``).join(', ')}.`,
  '',
  '| ID | Rule | Applies when | Result | Notes |',
  '|---|---|---|---|---|',
  ...rules.zoning.map((z) => {
    const notes = [z.message, z.checklist.length && `Checklist: ${z.checklist.join('; ')}`, z.config_flag && `Flag: \`${z.config_flag}\``, z.notes, z.assumptions.length && `⚠️ ${list(z.assumptions)}`]
      .filter(Boolean)
      .join('<br>');
    return `| ${z.id} | ${esc(z.title)} | ${z.triggers ? when(z.triggers) : ''} | ${z.status ?? ''} | ${esc(notes)} |`;
  }),
  '',
  '## 4. Forms and signers',
  '',
  '| Form | Name | Included when | Signed by | Notes |',
  '|---|---|---|---|---|',
  ...rules.forms.map((f) => `| ${f.id} | ${esc(f.name)} | ${esc(f.included)} | ${f.signer} | ${esc([f.notes, [...f.assumptions, ...f.office_questions].length && `⚠️ ${list([...f.assumptions, ...f.office_questions])}`].filter(Boolean).join(' '))} |`),
  '',
  '## 5. Plans',
  '',
  '| ID | Rule | Applies when the job has | Requirement | Message |',
  '|---|---|---|---|---|',
  ...rules.plans.map((p) => `| ${p.id} | ${esc(p.title)} | ${p.otherwise ? '*(anything else)*' : list(p.when_rules)} | ${p.requirement} | ${esc(p.message)}${[...p.assumptions, ...p.office_questions].length ? ` ⚠️ ${list([...p.assumptions, ...p.office_questions])}` : ''} |`),
  '',
  '## 6. Work type, cost and quantities',
  '',
  '| ID | Field(s) | Rule |',
  '|---|---|---|',
  ...Object.values(rules.policies).map((p) => `| ${p.id} | ${esc(p.title)} | ${esc(p.rule)}${[...p.assumptions, ...p.office_questions].length ? ` ⚠️ ${list([...p.assumptions, ...p.office_questions])}` : ''} |`),
  '',
  '**Quantity lines (CQ-07)**',
  '',
  '| Form | Line | Counts | How many |',
  '|---|---|---|---|',
  ...rules.lines.map((l) => {
    const how = typeof l.count === 'number' ? `${l.count} each` : 'fact' in l.count ? `the item's ${l.count.fact}` : `fixtures: ${l.count.fixtures.join(', ')}`;
    const extra = [l.when_rules.length && `classified ${l.when_rules.join(' or ')}`, l.sized && 'has a size column', l.label && 'labelled with the item', l.marker && `marked ${l.marker}`].filter(Boolean);
    return `| ${l.form} | ${esc(l.line)} | ${when(l.when)}${extra.length ? ` (${extra.join('; ')})` : ''} | ${how} |`;
  }),
  '',
  '**F145 heating system (CQ-09)**: the first row that matches a work item applies; fuel comes from the item.',
  '',
  '| Applies when | Work | Distribution |',
  '|---|---|---|',
  ...rules.heating.map((h) => `| ${when(h.when)} | ${h.work} | ${h.distribution} |`),
  '',
  '## 7. Licensing and registration',
  '',
  '| ID | Check | Flag | Blocks printing |',
  '|---|---|---|---|',
  ...rules.licensing.map((r) => ('refers_to' in r ? `| ${r.id} | ${esc(r.title)} | *Shown as ${list(r.refers_to)}* | no |` : `| ${r.id} | ${esc(r.title)} | ${esc(r.message)} | ${r.blocks_printing ? 'yes' : 'no'} |`)),
  '',
  '## 8. Reviewer tips (non-blocking)',
  '',
  '| ID | Trigger | Applies when | Tip |',
  '|---|---|---|---|',
  ...rules.tips.map((t) => `| ${t.id} | ${esc(t.title)} | ${t.when_item ? when(t.when_item) : `property: ${cond(t.when_property!)}`} | ${esc(t.text)} |`),
  '',
  '## 9. Submitting the packet',
  '',
  '| ID | Line on the cover checklist | When | Source |',
  '|---|---|---|---|',
  ...rules.submission.map((s) => `| ${s.id} | ${esc(s.text)} | ${s.when_plans ? `plans: ${s.when_plans.join(' or ')}` : 'every packet'} | ${esc(s.citation ?? '')}${s.assumptions.length ? ` ⚠️ ${list(s.assumptions)}` : ''} |`),
  '',
  '## 10. Assumptions register',
  '',
  '| ID | Assumption | How to confirm |',
  '|---|---|---|',
  ...[...rules.assumptions.values()]
    .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))
    .map((a) => `| ${a.id} | ${esc(a.text)}${a.config_flag ? ` (config flag \`${a.config_flag}\`)` : ''} | ${esc(a.confirm_with)} |`),
  '',
  '## 11. Questions for the construction office',
  '',
  '| ID | Question | Status |',
  '|---|---|---|',
  ...[...rules.officeQuestions.values()].map((q) => `| ${q.id} | ${esc(q.text)} | ${q.status} |`),
  '',
);

writeFileSync(OUT, out.join('\n'));
console.log(`Wrote ${OUT} (rules version ${rules.version})`);
