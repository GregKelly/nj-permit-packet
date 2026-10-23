// Condition matching for the small rule language: equals, one-of, numeric comparisons.

import { UNKNOWN, type WorkItem } from './facts';
import type { Comparison, Cond, CondValue, When } from './load';

export interface Match {
  ok: boolean;
  /** Facts whose value was `unknown` and still matched: the conservative branch was taken. */
  unknowns: string[];
}

const NO: Match = { ok: false, unknowns: [] };

function compare(actual: unknown, c: Comparison): boolean {
  if (typeof actual !== 'number') return false; // `unknown` never satisfies a comparison
  if (c.lt !== undefined) return actual < c.lt;
  if (c.lte !== undefined) return actual <= c.lte;
  if (c.gt !== undefined) return actual > c.gt;
  if (c.gte !== undefined) return actual >= c.gte;
  return false;
}

function valueMatches(actual: unknown, expected: CondValue): boolean {
  if (actual === undefined) return false; // the item doesn't have this fact
  const options = Array.isArray(expected) ? expected : [expected];
  return options.some((o) => (typeof o === 'object' ? compare(actual, o) : actual === o));
}

/** All keys must match (AND). Keys are item facts, `kind`, or `property.<fact>`. */
export function matchCond(cond: Cond, item: WorkItem, property: Record<string, unknown>): Match {
  const unknowns: string[] = [];
  for (const [key, expected] of Object.entries(cond)) {
    const isProperty = key.startsWith('property.');
    const actual = isProperty ? property[key.slice('property.'.length)] : item[key];
    if (!valueMatches(actual, expected)) return NO;
    if (actual === UNKNOWN) unknowns.push(key);
  }
  return { ok: true, unknowns };
}

/** A list of conditions means "any of": the first one that matches is used. */
export function matchWhen(when: When, item: WorkItem, property: Record<string, unknown>): Match {
  for (const cond of Array.isArray(when) ? when : [when]) {
    const m = matchCond(cond, item, property);
    if (m.ok) return m;
  }
  return NO;
}

/** Match a condition written directly on property facts (scope rules, TP-05). */
export function matchProperty(cond: Cond, property: Record<string, unknown>): boolean {
  return Object.entries(cond).every(([key, expected]) => valueMatches(property[key], expected));
}
