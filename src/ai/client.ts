// The one place that talks to the Claude API. Each call sends a system prompt,
// one user message and an output format, and gets back the parsed answer.
//
// The key comes from ANTHROPIC_API_KEY (or an `ant auth login` profile); it is
// never stored in the project. Nothing here reads the profile or directory:
// callers pass in only what the design doc allows to leave the machine (§5).

import Anthropic from '@anthropic-ai/sdk';
import * as z from 'zod/v4';
import { PRICES, SETTINGS, type AiCall, type CallSettings } from './config';

/** Why an AI call produced no usable answer. The app then takes the manual path. */
export class AiError extends Error {
  constructor(
    message: string,
    readonly reason: 'no_key' | 'network' | 'refused' | 'too_long' | 'invalid' | 'api',
  ) {
    super(message);
  }
}

export interface Usage {
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
}

export interface CallResult<T> {
  output: T;
  usage: Usage;
}

/** The request for one call, built without network access (tests check what it contains). */
export interface AiRequest<S extends z.ZodType> {
  call: AiCall;
  system: string;
  user: string;
  schema: S;
}

/** Sends requests to the API. Swappable so tests and the eval can replay recorded answers. */
export type Transport = <S extends z.ZodType>(req: AiRequest<S>, settings: CallSettings) => Promise<CallResult<z.infer<S>>>;

let client: Anthropic | null = null;

/** Keywords the API's output formats don't accept; the zod check after the call still enforces them. */
const UNSUPPORTED = new Set(['$schema', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf', 'minLength', 'maxLength', 'pattern']);

/**
 * The JSON schema sent to the API. Built directly rather than with the SDK's zod
 * helper, which turns `enum` and `const` into descriptions; kept here, the API
 * enforces the allowed values while the answer is written.
 */
export function outputSchema(schema: z.ZodType): Record<string, unknown> {
  const clean = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(clean);
    if (!node || typeof node !== 'object') return node;
    return Object.fromEntries(Object.entries(node).filter(([k]) => !UNSUPPORTED.has(k)).map(([k, v]) => [k, clean(v)]));
  };
  return clean(z.toJSONSchema(schema)) as Record<string, unknown>;
}

export const apiTransport: Transport = async (req, settings) => {
  client ??= new Anthropic();
  let response;
  try {
    response = await client.messages.create({
      model: settings.model,
      max_tokens: settings.max_tokens,
      output_config: { effort: settings.effort, format: { type: 'json_schema', schema: outputSchema(req.schema) } },
      system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: req.user }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) throw new AiError('No valid Claude API key. Set ANTHROPIC_API_KEY.', 'no_key');
    if (error instanceof Anthropic.APIConnectionError) throw new AiError('Could not reach the Claude API.', 'network');
    if (error instanceof Anthropic.APIError) throw new AiError(`Claude API error ${error.status}: ${error.message}`, 'api');
    if (error instanceof Error && /api key|apiKey|authentication/i.test(error.message)) throw new AiError('No Claude API key. Set ANTHROPIC_API_KEY.', 'no_key');
    throw error;
  }
  if (response.stop_reason === 'refusal') throw new AiError('The model declined this request.', 'refused');
  if (response.stop_reason === 'max_tokens') throw new AiError('The answer was cut off (too long).', 'too_long');
  const text = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  let parsed;
  try {
    parsed = req.schema.safeParse(JSON.parse(text));
  } catch {
    throw new AiError('The answer was not valid JSON.', 'invalid');
  }
  if (!parsed.success) throw new AiError(`The answer did not match the expected format: ${parsed.error.message}`, 'invalid');
  const price = PRICES[settings.model];
  const { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens } = response.usage;
  const input = input_tokens + (cache_creation_input_tokens ?? 0) * 1.25 + (cache_read_input_tokens ?? 0) * 0.1;
  return {
    output: parsed.data,
    usage: {
      model: settings.model,
      input_tokens: input_tokens + (cache_creation_input_tokens ?? 0) + (cache_read_input_tokens ?? 0),
      output_tokens,
      cost: (input * price.input + output_tokens * price.output) / 1e6,
    },
  };
};

export interface CallOptions {
  transport?: Transport;
  /** Override the configured model or effort (the eval compares models). */
  settings?: Partial<CallSettings>;
}

export function settingsFor(call: AiCall, options: CallOptions = {}): CallSettings {
  return { ...SETTINGS[call], ...options.settings };
}

export function send<S extends z.ZodType>(req: AiRequest<S>, options: CallOptions = {}) {
  return (options.transport ?? apiTransport)(req, settingsFor(req.call, options));
}

/** Add up the usage of several calls (a call plus its retry). */
export function totalUsage(usages: Usage[]): Usage | null {
  if (!usages.length) return null;
  return usages.reduce((a, b) => ({
    model: a.model === b.model ? a.model : `${a.model}+${b.model}`,
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    cost: a.cost + b.cost,
  }));
}
