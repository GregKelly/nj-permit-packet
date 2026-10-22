import { evaluate } from './core';
import type { JobFacts } from './facts';
import type { RuleSet } from './load';
import { selectQuestions } from './questions';
import type { Determinations } from './types';

/**
 * Facts in, determinations out. Same input → same output.
 * `today` (YYYY-MM-DD) is passed in for the license-expiry check; the engine never reads the clock.
 */
export function determine(facts: JobFacts, rules: RuleSet, today: string): Determinations {
  const { d } = evaluate(facts, rules, today);
  d.questions = selectQuestions(facts, rules, today);
  return d;
}
