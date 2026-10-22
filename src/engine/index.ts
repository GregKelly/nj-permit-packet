// Public surface of the rules engine. Pure: no network, database, clock or framework.

export * from './facts';
export * from './types';
export { compileRules, type RuleSet, type RuleSource } from './load';
export { determine } from './determine';
export { selectQuestions } from './questions';
