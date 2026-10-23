// Loads the test-job fixtures (tests/jobs/*.yaml) and turns them into fact lists.

import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
import { parseJobFacts, type Determinations, type JobFacts } from '../src/engine';
import type { Contractor, Subcontractor } from '../src/packet/types';

export const TODAY = '2026-10-22';
const JOBS_DIR = new URL('./jobs/', import.meta.url).pathname;

interface Profile {
  applicant: Contractor;
  subcontractors: Record<string, Subcontractor>;
  default_team: Record<string, string>;
}

export interface JobFixture {
  id: string;
  title: string;
  /** Facts before follow-ups. */
  before: JobFacts;
  /** Facts after the follow-up answers are applied. */
  after: JobFacts;
  expected_questions: string[];
  answers: Record<string, unknown>;
  expected: Record<string, any>;
  raw: Record<string, any>;
}

export const profile: Profile = parse(readFileSync(JOBS_DIR + '_profile.yaml', 'utf8'));

/** Build a fact list from a job's raw YAML, filling the team from the shared profile. */
export function buildFacts(raw: Record<string, any>): JobFacts {
  const picks = { ...profile.default_team, ...(raw.team ?? {}) };
  // The engine only needs names, registration and licenses; contact details are for the packet.
  const team: Record<string, unknown> = { applicant: { name: profile.applicant.name, hic_registration: profile.applicant.hic_registration } };
  for (const [trade, key] of Object.entries(picks) as [string, string | null][]) {
    if (key === null) continue;
    const { name, license, expires } = profile.subcontractors[key];
    team[trade] = { name, license, expires };
  }
  return parseJobFacts({
    property: raw.property,
    costs: raw.costs,
    performed_by: raw.performed_by,
    team,
    work_items: raw.work_items,
  });
}

/** Apply follow-up answers: keys are `<item id>.<fact>`, `costs.<trade>` or `property.<fact>`. */
export function applyAnswers(raw: Record<string, any>, answers: Record<string, unknown>): Record<string, any> {
  const next = structuredClone(raw);
  for (const [key, value] of Object.entries(answers)) {
    const [head, fact] = key.split('.');
    if (head === 'costs' || head === 'property') {
      next[head] = { ...(next[head] ?? {}), [fact]: value };
      continue;
    }
    const item = next.work_items.find((i: { id: string }) => i.id === head);
    if (!item) throw new Error(`answer ${key}: no work item "${head}"`);
    item[fact] = value;
  }
  return next;
}

export function loadJob(file: string): JobFixture {
  const raw = parse(readFileSync(JOBS_DIR + file, 'utf8'));
  const answers = raw.answers ?? {};
  return {
    id: raw.id,
    title: raw.title,
    before: buildFacts(raw),
    after: buildFacts(applyAnswers(raw, answers)),
    expected_questions: raw.expected_questions ?? [],
    answers,
    expected: raw.expected,
    raw,
  };
}

export function loadJobs(): JobFixture[] {
  return readdirSync(JOBS_DIR)
    .filter((f) => /^J-.*\.yaml$/.test(f))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
    .map(loadJob);
}

/** The parts of the determinations the test doc states, in the fixtures' shape. */
export function summarize(d: Determinations) {
  return {
    outcome: d.outcome,
    job_tier: d.job_tier,
    items: Object.fromEntries(d.items.map((i) => [i.item_id, { rule: i.rule_id, tier: i.tier }])),
    forms: Object.fromEntries(d.forms.map((f) => [f.form, f.signer])),
    zoning: d.zoning && { rule: d.zoning.rule_id, status: d.zoning.status },
    plans: d.plans && { rule: d.plans.rule_id, requirement: d.plans.requirement },
    tips: d.tips.map((t) => t.id),
    flags: d.flags.map((f) => f.id),
  };
}
