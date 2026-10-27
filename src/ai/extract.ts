// Call 1: the contractor's description in, facts out (M3 plan, "How each call works").
//
// Only the description is sent. The answer comes back with each item's facts as
// name/value pairs (src/ai/schema.ts, "What's sent to the API"), is rebuilt into
// typed items and checked (src/ai/checks.ts) and, if it
// fails, asked for once more with the problems listed. Then plain code turns it
// into the engine's fact shapes and matches any names to the subcontractor directory.

import { readFileSync } from 'node:fs';
import { projectPath } from '../paths';
import { UNKNOWN, WORK_ITEM_KINDS } from '../engine/facts';
import { checkExtract } from './checks';
import { AiError, send, totalUsage, type CallOptions, type Usage } from './client';
import { ExtractWire, fromWire, type ExtractOutput } from './schema';

const PROMPT = readFileSync(projectPath('src', 'ai', 'prompts', 'extract.md'), 'utf8');

export function extractRequest(description: string, problems: string[] = []) {
  const retry = problems.length
    ? `\n\nA previous answer for this description had these problems. Fix them:\n${problems.map((p) => `- ${p}`).join('\n')}`
    : '';
  return { call: 'extract' as const, system: PROMPT, user: `Job description:\n\n${description}${retry}`, schema: ExtractWire };
}

export interface ExtractResult {
  /** The answer, or null when both tries failed. */
  output: ExtractOutput | null;
  /** Problems with the final answer (or why there's no answer). Empty when it passed. */
  problems: string[];
  attempts: number;
  usage: Usage | null;
}

export async function extract(description: string, options: CallOptions = {}): Promise<ExtractResult> {
  const usages: Usage[] = [];
  let problems: string[] = [];
  let output: ExtractOutput | null = null;
  let attempts = 0;
  while (attempts < 2) {
    attempts++;
    try {
      const result = await send(extractRequest(description, problems), options);
      usages.push(result.usage);
      const typed = fromWire(result.output);
      output = typed.output;
      problems = output ? checkExtract(output, description) : typed.problems;
    } catch (error) {
      if (!(error instanceof AiError) || !['invalid', 'too_long'].includes(error.reason)) throw error;
      output = null;
      problems = [error.message];
    }
    if (!problems.length) break;
  }
  return { output, problems, attempts, usage: totalUsage(usages) };
}

// ── From the AI's answer to the engine's facts ────────────────────────────────

/** A subcontractor directory entry, as far as name matching needs it. */
export interface DirectoryEntry {
  key: string;
  name: string;
  trade: 'electrical' | 'plumbing' | 'hvacr';
}

export interface NamedWorker {
  trade: string;
  /** As written in the description. */
  name: string;
  /** The directory entry it matches, or null: the contractor must pick (or confirm it's the owner). */
  match: string | null;
}

export interface ExtractedJob {
  /** In the shape of a test job's raw facts: work_items, costs, performed_by, property facts and team picks. */
  raw: {
    work_items: Record<string, unknown>[];
    costs: Record<string, number | null>;
    performed_by: Record<string, unknown>;
    property: Record<string, string>;
    team: Record<string, string>;
  };
  /** Quotes from the description, by question key, for the follow-up questions. */
  quotes: Record<string, string>;
  named: NamedWorker[];
  not_covered: string[];
}

const TEAM_TRADE: Record<string, DirectoryEntry['trade'] | null> = { building: null, electrical: 'electrical', plumbing: 'plumbing', mechanical: 'hvacr' };
const NOISE = new Set(['llc', 'inc', 'co', 'company', 'the', 'and', '&', 'of', 'plumbing', 'heating', 'cooling', 'electric', 'electrical', 'mechanical', 'hvac']);
const words = (s: string) => s.toLowerCase().match(/[a-z0-9&]+/g)?.filter((w) => !NOISE.has(w)) ?? [];

/** Match a name as written ("Northside", "Sutton Plumbing") to one directory entry of that trade. */
export function matchDirectory(name: string, trade: string, directory: DirectoryEntry[]): string | null {
  const want = new Set(words(name));
  const hits = directory.filter((e) => e.trade === TEAM_TRADE[trade] && words(e.name).some((w) => want.has(w)));
  return hits.length === 1 ? hits[0].key : null;
}

export function toFacts(out: ExtractOutput, directory: DirectoryEntry[]): ExtractedJob {
  const work_items = (out.work_items as Record<string, unknown>[]).map((item) => {
    const facts: Record<string, unknown> = { id: item.id, kind: item.kind, label: item.label };
    for (const [name, spec] of Object.entries(WORK_ITEM_KINDS[item.kind as string])) {
      const v = item[name];
      if (spec.type === 'fixtures') {
        const fx: Record<string, number> = {};
        for (const f of v as { fixture: string; count: number }[]) fx[f.fixture] = (fx[f.fixture] ?? 0) + f.count;
        facts[name] = fx;
      } else if (spec.type === 'text') {
        if (v) facts[name] = v;
      } else facts[name] = v;
    }
    return facts;
  });

  const performed_by: Record<string, unknown> = {};
  const team: Record<string, string> = {};
  const named: NamedWorker[] = [];
  for (const [trade, who] of Object.entries(out.performed_by)) {
    if (who.who === 'owner') performed_by[trade] = who.owner_item_ids.length ? { owner: who.owner_item_ids } : 'owner';
    if (who.who === 'named' && who.name) {
      const match = matchDirectory(who.name, trade, directory);
      named.push({ trade, name: who.name, match });
      const teamTrade = TEAM_TRADE[trade];
      if (match && teamTrade) team[teamTrade] = match;
    }
  }

  const property: Record<string, string> = {};
  for (const [k, v] of Object.entries(out.property as Record<string, string>)) if (v !== UNKNOWN) property[k] = v;

  return {
    raw: { work_items, costs: { ...out.costs }, performed_by, property, team },
    quotes: Object.fromEntries(out.quotes.map((q) => [q.key, q.quote])),
    named,
    not_covered: out.not_covered,
  };
}
