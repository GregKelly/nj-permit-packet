// Scoring an extraction against an answer key (M3 plan, "How extraction is scored").
//
// The AI may split or name work items differently from the answer key, so items
// are matched first (same kind, most facts in common). Then each fact is compared:
// - guessed: a value where the answer key has `unknown` (target: zero, every run)
// - wrong:   a value that differs from the answer key
// - missed:  `unknown` where the answer key has a value (shows up as an extra question)
//
// "Same result" plays the contractor: it answers the engine's questions from the
// answer key's facts after follow-ups, round by round, and compares the final
// determinations with the approved ones.

import { determine, type Determinations, type JobFacts, type RuleSet } from '../../engine';
import { UNKNOWN, WORK_ITEM_KINDS } from '../../engine/facts';
import { applyAnswers, MAX_ROUNDS, openQuestions } from '../flow';

export type Raw = Record<string, any>;
export type Build = (raw: Raw) => JobFacts;

export interface FactDiff {
  key: string;
  expected: unknown;
  got: unknown;
}

export interface ItemMatch {
  /** The answer key's item id, or null for an AI item that matches none. */
  gold: string | null;
  /** The AI's item id, or null for an answer-key item the AI didn't produce. */
  ai: string | null;
  kind: string;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const sortedFixtures = (fx: unknown) => Object.entries((fx ?? {}) as Record<string, number>).sort(([a], [b]) => a.localeCompare(b));
const words = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]+/g) ?? []);

/** Scored facts of one kind: everything but free-text sizes. */
const scoredFacts = (kind: string) => Object.entries(WORK_ITEM_KINDS[kind]).filter(([, spec]) => spec.type !== 'text');

function similarity(a: Raw, b: Raw): number {
  let score = 1; // same kind
  for (const [name, spec] of scoredFacts(a.kind)) {
    if (spec.type === 'fixtures' ? same(sortedFixtures(a[name]), sortedFixtures(b[name])) : same(a[name], b[name])) score += 1;
  }
  const wa = words(a.label);
  const wb = words(b.label);
  const overlap = [...wa].filter((w) => wb.has(w)).length / Math.max(1, Math.min(wa.size, wb.size));
  return score + overlap;
}

/** Pair AI items with answer-key items of the same kind, best matches first. */
export function alignItems(ai: Raw[], gold: Raw[]): ItemMatch[] {
  const pairs: { s: number; a: Raw; g: Raw }[] = [];
  for (const a of ai) for (const g of gold) if (a.kind === g.kind) pairs.push({ s: similarity(a, g), a, g });
  pairs.sort((x, y) => y.s - x.s);
  const usedA = new Set<string>();
  const usedG = new Set<string>();
  const matches: ItemMatch[] = [];
  for (const { a, g } of pairs) {
    if (usedA.has(a.id) || usedG.has(g.id)) continue;
    usedA.add(a.id);
    usedG.add(g.id);
    matches.push({ gold: g.id, ai: a.id, kind: g.kind });
  }
  for (const a of ai) if (!usedA.has(a.id)) matches.push({ gold: null, ai: a.id, kind: a.kind });
  for (const g of gold) if (!usedG.has(g.id)) matches.push({ gold: g.id, ai: null, kind: g.kind });
  return matches;
}

export interface FactScore {
  guessed: FactDiff[];
  wrong: FactDiff[];
  missed: FactDiff[];
  extra_items: string[];
  missing_items: string[];
}

function compare(key: string, expected: unknown, got: unknown, s: FactScore, blank: unknown) {
  if (same(expected, got)) return;
  if (same(expected, blank)) s.guessed.push({ key, expected, got });
  else if (same(got, blank)) s.missed.push({ key, expected, got });
  else s.wrong.push({ key, expected, got });
}

/**
 * Compare extracted facts (parsed, so unstated facts are `unknown`) with the answer key's
 * facts before follow-ups. Property facts the parcel lookup or contractor supply
 * (dwelling type) count only when the AI gives a value.
 */
export function scoreFacts(ai: JobFacts, gold: JobFacts, matches: ItemMatch[], aiRaw: Raw, goldRaw: Raw, defaultTeam: Record<string, string> = {}): FactScore {
  const s: FactScore = { guessed: [], wrong: [], missed: [], extra_items: [], missing_items: [] };
  const aiItems = new Map(ai.work_items.map((i) => [i.id, i]));
  const goldItems = new Map(gold.work_items.map((i) => [i.id, i]));
  for (const m of matches) {
    if (!m.gold) {
      s.extra_items.push(`${m.ai} (${m.kind}: ${aiItems.get(m.ai!)!.label})`);
      continue;
    }
    if (!m.ai) {
      s.missing_items.push(`${m.gold} (${m.kind}: ${goldItems.get(m.gold)!.label})`);
      continue;
    }
    const a = aiItems.get(m.ai)!;
    const g = goldItems.get(m.gold)!;
    for (const [name, spec] of scoredFacts(m.kind)) {
      const key = `${m.gold}.${name}`;
      if (spec.type === 'fixtures') compare(key, Object.fromEntries(sortedFixtures(g[name])), Object.fromEntries(sortedFixtures(a[name])), s, {});
      else compare(key, g[name], a[name], s, UNKNOWN);
    }
  }
  for (const trade of ['total', 'building', 'electrical', 'plumbing', 'mechanical']) {
    compare(`costs.${trade}`, (gold.costs as Raw)[trade], (ai.costs as Raw)[trade], s, null);
  }
  for (const fact of ['owner_occupied', 'own_sewer']) {
    compare(`property.${fact}`, (gold.property as Raw)[fact], (ai.property as Raw)[fact], s, UNKNOWN);
  }
  const dwelling = aiRaw.property?.dwelling_type;
  if (dwelling && dwelling !== gold.property.dwelling_type) s.wrong.push({ key: 'property.dwelling_type', expected: gold.property.dwelling_type, got: dwelling });

  // Who does the work, and which named sub was picked from the directory.
  const goldIds = new Map(matches.filter((m) => m.ai && m.gold).map((m) => [m.ai!, m.gold!]));
  const performed = (p: Raw, rename: boolean) =>
    Object.fromEntries(
      Object.entries(p ?? {}).map(([t, w]) => [t, typeof w === 'object' ? { owner: (w.owner as string[]).map((id) => (rename ? goldIds.get(id) ?? id : id)).sort() } : w]),
    );
  for (const trade of ['building', 'electrical', 'plumbing', 'mechanical']) {
    const e = performed(goldRaw.performed_by, false)[trade] ?? 'contractor';
    const g = performed(aiRaw.performed_by, true)[trade] ?? 'contractor';
    if (!same(e, g)) s.wrong.push({ key: `performed_by.${trade}`, expected: e, got: g });
  }
  for (const trade of ['electrical', 'plumbing', 'hvacr']) {
    // Naming the sub that's already the default isn't a difference (J-09: "Clearair is installing").
    const e = goldRaw.team?.[trade] ?? defaultTeam[trade];
    const g = aiRaw.team?.[trade] ?? defaultTeam[trade];
    if (e !== g) (goldRaw.team?.[trade] ? s.wrong : s.guessed).push({ key: `team.${trade}`, expected: e ?? '(none)', got: g ?? '(none)' });
  }
  return s;
}

/** The AI's raw facts with item ids renamed to the answer key's, so answers and results line up. */
export function renameItems(aiRaw: Raw, matches: ItemMatch[]): Raw {
  const ids = new Map(matches.filter((m) => m.ai && m.gold).map((m) => [m.ai!, m.gold!]));
  const out = structuredClone(aiRaw);
  const taken = new Set(ids.values());
  for (const item of out.work_items) {
    const id = ids.get(item.id);
    if (id) item.id = id;
    else if (taken.has(item.id)) item.id = `ai_${item.id}`; // an unmatched AI item that happens to share a gold id
  }
  for (const who of Object.values(out.performed_by ?? {}) as any[]) {
    if (who && typeof who === 'object') who.owner = who.owner.map((id: string) => ids.get(id) ?? id);
  }
  return out;
}

/** The contractor's answer to a question, read from the answer key's facts after follow-ups. */
function oracle(key: string, goldAfter: JobFacts): unknown {
  const [head, fact] = key.split('.');
  if (head === 'costs') return (goldAfter.costs as Raw)[fact];
  if (head === 'property') return (goldAfter.property as Raw)[fact];
  const item = goldAfter.work_items.find((i) => i.id === head);
  return item ? item[fact] : UNKNOWN; // an AI item the answer key doesn't have: "Don't know"
}

/** The decision-making parts of the determinations, as the approved test jobs check them. */
export function resultOf(d: Determinations) {
  const entries = structuredClone(d.form_entries) as Raw;
  for (const e of Object.values(entries)) for (const l of e.lines ?? []) delete l.label; // "Other" lines carry the AI's own label
  return {
    outcome: d.outcome,
    job_tier: d.job_tier,
    // Sorted, so the order the AI listed its items in doesn't count as a difference.
    items: Object.fromEntries(d.items.map((i) => [i.item_id, [i.rule_id, i.tier]]).sort(([a], [b]) => String(a).localeCompare(String(b)))),
    forms: Object.fromEntries(d.forms.map((f) => [f.form, f.signer])),
    zoning: d.zoning && [d.zoning.rule_id, d.zoning.status],
    plans: d.plans && [d.plans.rule_id, d.plans.requirement],
    tips: d.tips.map((t) => t.id),
    flags: d.flags.map((f) => f.id),
    form_entries: entries,
    fill_ins: d.fill_ins,
    owner_notes: d.owner_notes.map((n) => n.id),
  };
}

export interface RoundsResult {
  /** Questions asked in each round, by the answer key's item ids. */
  rounds: string[][];
  /** Questions the contractor answered "Don't know" (the answer key has them unknown too). */
  declined: string[];
  final: Determinations;
  /** Parts of the final result that differ from the approved one; empty means the same result. */
  differences: string[];
}

export function playRounds(aiRaw: Raw, goldAfter: JobFacts, expected: Determinations, build: Build, rules: RuleSet, today: string): RoundsResult {
  let raw = aiRaw;
  const declined = new Set<string>();
  const rounds: string[][] = [];
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const asked = openQuestions(build(raw), rules, today, declined);
    if (!asked.length) break;
    rounds.push(asked.map((q) => q.key));
    const answers = Object.fromEntries(asked.map((q) => [q.key, oracle(q.key, goldAfter)]));
    const next = applyAnswers(raw, answers);
    raw = next.raw;
    next.declined.forEach((k) => declined.add(k));
  }
  const final = determine(build(raw), rules, today);
  const got = resultOf(final);
  const want = resultOf(expected);
  // An AI item the answer key doesn't have (one approved item split in two) isn't a difference
  // by itself: every approved item must still get its rule, and the forms and entries must match.
  for (const id of Object.keys(got.items)) if (!(id in want.items)) delete got.items[id];
  const differences = (Object.keys(want) as (keyof typeof want)[])
    .filter((k) => !same(got[k], want[k]))
    .map((k) => `${k}: expected ${JSON.stringify(want[k])}, got ${JSON.stringify(got[k])}`);
  return { rounds, declined: [...declined], final, differences };
}

/** Question keys from the AI's item ids to the answer key's (`island.action` etc.). */
export function renameKey(key: string, matches: ItemMatch[]): string {
  const [head, fact] = key.split('.');
  const m = matches.find((x) => x.ai === head && x.gold);
  return m ? `${m.gold}.${fact}` : key;
}

export function renameQuotes(quotes: Record<string, string>, matches: ItemMatch[]): Record<string, string> {
  return Object.fromEntries(Object.entries(quotes).map(([k, q]) => [renameKey(k, matches), q]));
}
