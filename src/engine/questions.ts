// Choosing follow-up questions (design doc §5). The engine decides which
// unknowns matter, not the AI: for each unknown fact, try each possible value.
// If the determinations differ, the fact is decision-relevant and gets asked.
//
// Refinements (M1 plan, decision 2):
// - Other unknown facts stay unknown while one fact is tried ("would knowing just
//   this change the answer, given what we know now?").
// - Counts are tried only at the thresholds the rules compare them to (5 vs 6).
// - Form entries are left out of the comparison: sizes and details are filled in
//   by the sub (CQ-08), and costs follow their own rule below.
// - A missing cost for a trade that has a section is always asked, except the
//   trade that takes the remainder of the total (CQ-03).

import { PROPERTY_FACTS, UNKNOWN, WORK_ITEM_KINDS, type FactSpec, type JobFacts } from './facts';
import type { RuleSet } from './load';
import { evaluate } from './core';
import type { Determinations, Question } from './types';

/** The decision-making parts of the determinations (form entries left out). */
function signature(d: Determinations): string {
  return JSON.stringify([
    d.outcome,
    d.job_tier,
    d.items.map((i) => [i.item_id, i.rule_id, i.tier, i.forms]),
    d.forms.map((f) => [f.form, f.signer]),
    d.zoning && [d.zoning.rule_id, d.zoning.status],
    d.plans?.rule_id,
    d.tips.map((t) => t.id),
    d.flags.map((f) => f.id),
  ]);
}

function candidates(spec: FactSpec, thresholdKey: string, rules: RuleSet): readonly (string | number)[] {
  if (spec.type === 'choice') return spec.values;
  if (spec.type === 'count') return rules.thresholds.get(thresholdKey) ?? [];
  return [];
}

function matters(facts: JobFacts, values: readonly (string | number)[], set: (f: JobFacts, v: string | number) => void, rules: RuleSet, today: string) {
  if (values.length < 2) return false;
  const seen = new Set<string>();
  for (const v of values) {
    const variant = structuredClone(facts);
    set(variant, v);
    seen.add(signature(evaluate(variant, rules, today).d));
    if (seen.size > 1) return true;
  }
  return false;
}

export function selectQuestions(facts: JobFacts, rules: RuleSet, today: string): Question[] {
  const questions: Question[] = [];
  const options = (spec: FactSpec) => (spec.type === 'choice' ? [...spec.values] : []);

  for (const [fact, spec] of Object.entries(PROPERTY_FACTS)) {
    if ((facts.property as Record<string, unknown>)[fact] !== UNKNOWN) continue;
    const values = candidates(spec, `property.${fact}`, rules);
    if (matters(facts, values, (f, v) => ((f.property as Record<string, unknown>)[fact] = v), rules, today)) {
      questions.push({ key: `property.${fact}`, fact, options: options(spec) });
    }
  }

  facts.work_items.forEach((item, index) => {
    for (const [fact, spec] of Object.entries(WORK_ITEM_KINDS[item.kind])) {
      if (item[fact] !== UNKNOWN) continue;
      const values = candidates(spec, `${item.kind}.${fact}`, rules);
      if (matters(facts, values, (f, v) => (f.work_items[index][fact] = v), rules, today)) {
        questions.push({ key: `${item.id}.${fact}`, item_id: item.id, fact, options: options(spec) });
      }
    }
  });

  const { d, presentTrades, remainderTrade } = evaluate(facts, rules, today);
  if (d.job_tier === 'MW' || d.job_tier === 'FULL') {
    const costs = facts.costs as Record<string, number | null>;
    if (costs.total === null && remainderTrade && costs[remainderTrade] === null) {
      questions.push({ key: 'costs.total', fact: 'total', options: [] });
    }
    for (const trade of presentTrades) {
      if (trade !== remainderTrade && costs[trade] === null) questions.push({ key: `costs.${trade}`, fact: trade, options: [] });
    }
  }
  return questions;
}
