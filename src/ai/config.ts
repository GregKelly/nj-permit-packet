// Model and effort level for each AI call (M3 plan, "What gets built").
// Everything starts on Sonnet 5.5 (design doc §5); the evals decide the final choice.

export type AiCall = 'extract' | 'questions' | 'scope';
export type Effort = 'low' | 'medium' | 'high';

export const MODELS = ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'] as const;
export type Model = (typeof MODELS)[number];

export interface CallSettings {
  model: Model;
  effort: Effort;
  max_tokens: number;
}

export const SETTINGS: Record<AiCall, CallSettings> = {
  extract: { model: 'claude-sonnet-5-5', effort: 'high', max_tokens: 16000 },
  questions: { model: 'claude-sonnet-5-5', effort: 'medium', max_tokens: 8000 },
  scope: { model: 'claude-sonnet-5-5', effort: 'medium', max_tokens: 8000 },
};

/** List prices in dollars per million tokens (input, output), for the eval report's cost column. */
export const PRICES: Record<Model, { input: number; output: number }> = {
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-opus-5-5': { input: 4, output: 20 },
};
