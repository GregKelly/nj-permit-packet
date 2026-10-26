// Saved AI answers, so tests run without a key or network and a code change
// can't silently break the path from an AI answer to the determinations.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { AiError, apiTransport, type Transport } from './client';

export interface Recording {
  /** "api" for a real answer saved by `npm run eval -- --record`; "hand-written" for a test-only stand-in. */
  source: 'api' | 'hand-written';
  model?: string;
  output: unknown;
}

/** Replays one saved answer per call; the answer must still fit the current output format. */
export function replayTransport(answers: Partial<Record<'extract' | 'questions' | 'scope', Recording>>): Transport {
  return async (req, settings) => {
    const rec = answers[req.call];
    if (!rec) throw new AiError(`No saved answer for the ${req.call} call.`, 'network');
    const parsed = req.schema.safeParse(rec.output);
    if (!parsed.success) throw new AiError(`Saved ${req.call} answer no longer fits the format: ${parsed.error.message}`, 'invalid');
    return { output: parsed.data, usage: { model: rec.model ?? settings.model, input_tokens: 0, output_tokens: 0, cost: 0 } };
  };
}

export function loadRecording(path: string): Recording {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Calls the API (or `base`) and saves each answer to `${prefix}.<call>.json`. */
export function recordingTransport(prefix: string, base: Transport = apiTransport): Transport {
  return async (req, settings) => {
    const result = await base(req, settings);
    const path = `${prefix}.${req.call}.json`;
    mkdirSync(dirname(path), { recursive: true });
    const rec: Recording = { source: 'api', model: result.usage.model, output: result.output };
    writeFileSync(path, JSON.stringify(rec, null, 2) + '\n');
    return result;
  };
}
