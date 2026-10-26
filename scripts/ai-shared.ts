// Shared by the AI commands (extract, ask, scope, eval): loading jobs and
// printing facts in plain language.

import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import type { JobFacts } from '../src/engine';
import { UNKNOWN } from '../src/engine/facts';
import type { CallSettings, Model } from '../src/ai/config';
import type { DirectoryEntry, ExtractedJob } from '../src/ai/extract';
import type { EvalOnlySpec } from '../src/ai/eval/score-eval-only';
import { loadJob, loadJobs, profile, type JobFixture } from '../tests/helpers';

export const directory: DirectoryEntry[] = Object.entries(profile.subcontractors).map(([key, s]) => ({ key, name: s.name, trade: s.trade }));

const EVAL_DIR = new URL('../tests/ai/eval-jobs/', import.meta.url).pathname;

export function loadEvalOnly(): EvalOnlySpec[] {
  return readdirSync(EVAL_DIR)
    .filter((f) => /^E-\d+\.yaml$/.test(f))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
    .map((f) => parse(readFileSync(EVAL_DIR + f, 'utf8')));
}

/** The 13 test jobs with their own description (variants like J-05b reuse another's). */
export const testJobs = (): JobFixture[] => loadJobs().filter((j) => !j.raw.variant_of);

export type AnyJob = { kind: 'test'; job: JobFixture } | { kind: 'eval'; spec: EvalOnlySpec };

export function findJob(id: string): AnyJob {
  if (id.startsWith('E-')) {
    const spec = loadEvalOnly().find((s) => s.id === id);
    if (!spec) throw new Error(`No eval-only description ${id}`);
    return { kind: 'eval', spec };
  }
  return { kind: 'test', job: loadJob(`${id}.yaml`) };
}

export const descriptionOf = (j: AnyJob) => (j.kind === 'test' ? (j.job.raw.description as string) : j.spec.description);

const SHORT: Record<string, Model> = { haiku: 'claude-haiku-5-5', sonnet: 'claude-sonnet-5-5', opus: 'claude-opus-5-5' };

/** `--model sonnet` → settings override. */
export function modelArg(args: string[]): Partial<CallSettings> {
  const i = args.indexOf('--model');
  if (i < 0) return {};
  const model = SHORT[args[i + 1]] ?? args[i + 1];
  return { model: model as Model };
}

export const idArg = (args: string[]) => args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--model');

const show = (v: unknown) => (v === UNKNOWN ? '?' : typeof v === 'object' ? JSON.stringify(v) : String(v));

/** Work items, costs and who does what, one line each; `?` marks unknown. */
export function factLines(facts: JobFacts): string[] {
  const lines = facts.work_items.map((i) => {
    const { id, kind, label, ...rest } = i;
    const facts = Object.entries(rest)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${show(v)}`)
      .join(' ');
    return `  ${id} (${kind}): ${label}${facts ? `  [${facts}]` : ''}`;
  });
  const costs = Object.entries(facts.costs)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `${k} $${(v as number).toLocaleString('en-US')}`);
  lines.push(`  Costs: ${costs.join(', ') || 'none stated'}`);
  const who = Object.entries(facts.performed_by).filter(([, w]) => w !== 'contractor');
  if (who.length) lines.push(`  Owner does: ${who.map(([t, w]) => `${t}${typeof w === 'object' ? ` (${w.owner.join(', ')})` : ''}`).join(', ')}`);
  const p = facts.property;
  lines.push(`  Property: dwelling ${show(p.dwelling_type)}, owner lives there ${show(p.owner_occupied)}, own sewer ${show(p.own_sewer)}`);
  return lines;
}

export function extrasLines(ex: ExtractedJob): string[] {
  const lines: string[] = [];
  for (const n of ex.named) lines.push(`  Named for ${n.trade}: "${n.name}" → ${n.match ? `directory: ${n.match}` : 'no match in the directory (the contractor picks)'}`);
  for (const t of ex.not_covered) lines.push(`  Not covered (call the office): "${t}"`);
  for (const [k, q] of Object.entries(ex.quotes)) lines.push(`  Quote for ${k}: "${q}"`);
  return lines;
}
