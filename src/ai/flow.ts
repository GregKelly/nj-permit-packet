// Follow-up rounds (M3 plan, change 3): ask, apply the answers, re-run the engine,
// and repeat until it has nothing left to ask. A "Don't know" answer leaves the
// fact unknown (the conservative rule applies) and that question isn't asked again.

import { selectQuestions, type JobFacts, type Question, type RuleSet } from '../engine';
import { UNKNOWN } from '../engine/facts';

/** The questions still open: the engine's, minus those already answered "Don't know". */
export function openQuestions(facts: JobFacts, rules: RuleSet, today: string, declined: ReadonlySet<string>): Question[] {
  return selectQuestions(facts, rules, today).filter((q) => !declined.has(q.key));
}

/**
 * Apply answers to raw facts (keys `<item id>.<fact>`, `costs.<trade>`, `property.<fact>`).
 * Returns the new raw facts and the keys answered "Don't know".
 */
export function applyAnswers(raw: Record<string, any>, answers: Record<string, unknown>) {
  const next = structuredClone(raw);
  const declined: string[] = [];
  for (const [key, value] of Object.entries(answers)) {
    if (value === UNKNOWN || value === null) {
      declined.push(key);
      continue;
    }
    const [head, fact] = key.split('.');
    if (head === 'costs' || head === 'property') {
      next[head] = { ...(next[head] ?? {}), [fact]: value };
      continue;
    }
    const item = next.work_items.find((i: { id: string }) => i.id === head);
    if (!item) throw new Error(`answer ${key}: no work item "${head}"`);
    item[fact] = value;
  }
  return { raw: next, declined };
}

/** The most rounds a job should ever need; more means answers keep opening new questions. */
export const MAX_ROUNDS = 5;
