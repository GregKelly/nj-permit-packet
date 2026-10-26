// Call 3: confirmed facts and determinations in, scope-of-work narrative out (M3 plan).
// Sends only the work items, their trades and costs: no owner, address or license
// details. The contractor edits and approves the text before printing (M4); the
// packet builder takes the approved text as input, so building never calls the API.

import { readFileSync } from 'node:fs';
import type { Determinations, JobFacts } from '../engine';
import { UNKNOWN } from '../engine/facts';
import { checkScope } from './checks';
import { AiError, send, totalUsage, type CallOptions, type Usage } from './client';
import { ScopeOutput } from './schema';

const PROMPT = readFileSync(new URL('./prompts/scope.md', import.meta.url), 'utf8');

const FORM_TRADE: Record<string, string> = { F110: 'building', F120: 'electrical', F130: 'plumbing', F145: 'mechanical' };

/** What the scope call sees: each permitted item under its trade(s), the rest as not permitted. */
export function scopeInput(facts: JobFacts, d: Determinations) {
  const items = new Map(facts.work_items.map((i) => [i.id, i]));
  const describe = (id: string) => {
    const { kind, ...rest } = items.get(id)!;
    return Object.fromEntries(Object.entries({ ...rest, type: kind }).filter(([, v]) => v !== UNKNOWN && v !== undefined));
  };
  const trades = Object.entries(FORM_TRADE)
    .filter(([form]) => d.forms.some((f) => f.form === form))
    .map(([form, trade]) => {
      const e = d.form_entries[form];
      return {
        trade,
        estimated_cost: e?.rehabilitation_cost ?? e?.est_cost ?? null,
        items: d.items.filter((i) => i.forms.includes(form)).map((i) => describe(i.item_id)),
      };
    });
  const not_permitted = d.items.filter((i) => i.tier === 'OM').map((i) => describe(i.item_id));
  return { trades, not_permitted, total_cost: d.form_entries.F100?.total_cost ?? null };
}

export function scopeRequest(facts: JobFacts, d: Determinations, problems: string[] = []) {
  const retry = problems.length ? `\n\nA previous answer had these problems. Fix them:\n${problems.map((p) => `- ${p}`).join('\n')}` : '';
  return {
    call: 'scope' as const,
    system: PROMPT,
    user: `Confirmed work, by trade:\n\n${JSON.stringify(scopeInput(facts, d), null, 2)}${retry}`,
    schema: ScopeOutput,
  };
}

export interface ScopeResult {
  output: ScopeOutput | null;
  /** The narrative as paragraphs, ready for the contractor to edit; empty when the call failed. */
  paragraphs: string[];
  problems: string[];
  usage: Usage | null;
}

const HEADINGS: Record<string, string> = {
  building: 'Building',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  mechanical: 'Mechanical',
  not_permitted: 'Also in this job',
};

export function toParagraphs(out: ScopeOutput): string[] {
  return out.sections.filter((s) => s.sentences.length).map((s) => `${HEADINGS[s.trade]}: ${s.sentences.map((x) => x.text.trim()).join(' ')}`);
}

export async function writeScope(facts: JobFacts, d: Determinations, options: CallOptions = {}): Promise<ScopeResult> {
  const usages: Usage[] = [];
  let problems: string[] = [];
  let output: ScopeOutput | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await send(scopeRequest(facts, d, problems), options);
      usages.push(result.usage);
      output = result.output;
      problems = checkScope(output, facts, d);
    } catch (error) {
      if (!(error instanceof AiError)) throw error;
      output = null;
      problems = [error.message];
      if (!['invalid', 'too_long'].includes(error.reason)) break;
    }
    if (!problems.length) break;
  }
  return { output, paragraphs: output && !problems.length ? toParagraphs(output) : [], problems, usage: totalUsage(usages) };
}
