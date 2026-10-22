// Placeholder: written after the tests (M1 plan: tests first).
export interface RuleSource { path: string; text: string }
export type RuleSet = { version: string; ids: Set<string> };
export function compileRules(_sources: RuleSource[]): RuleSet {
  throw new Error('not implemented yet');
}
