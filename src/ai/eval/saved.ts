// Every API answer the eval buys is saved, so it's only bought once. A later eval
// that sends the exact same request (same model, prompt, description, run number)
// reuses the saved answer for free; only a request that changed (a new prompt, a
// question the AI hasn't worded before) goes to the API. Changing the answer key or
// the scoring therefore costs nothing: `npm run eval -- --rescore` re-grades the
// saved answers without calling the API at all.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AiError, apiTransport, outputSchema, type CallResult, type Transport, type Usage } from '../client';

export const SAVED_DIR = 'out/eval/answers';

interface SavedAnswer {
  call: string;
  output: unknown;
  usage: Usage;
}

export interface SavedStats {
  /** Answers reused from earlier evals. */
  reused: number;
  /** Answers bought from the API this time. */
  bought: number;
  /** What this eval actually spent. */
  spent: number;
  /** Requests with no saved answer, by model (only counted with `offline`). */
  missing: Record<string, number>;
}

export const newStats = (): SavedStats => ({ reused: 0, bought: 0, spent: 0, missing: {} });

/**
 * Reuses the saved answer for a request, or buys it from the API and saves it.
 * `run` keeps runs apart: run 2 of a job is a fresh sample, not run 1 reused.
 * With `offline`, a request with no saved answer is counted and fails instead of
 * calling the API.
 */
export function savedTransport(run: number, stats: SavedStats, options: { offline?: boolean; base?: Transport; dir?: string } = {}): Transport {
  const base = options.base ?? apiTransport;
  const dir = options.dir ?? SAVED_DIR;
  return async (req, settings) => {
    const key = createHash('sha256')
      .update(JSON.stringify([req.call, req.system, req.user, outputSchema(req.schema), settings]))
      .digest('hex')
      .slice(0, 24);
    const path = join(dir, settings.model, `run-${run}`, `${req.call}-${key}.json`);
    if (existsSync(path)) {
      const saved = JSON.parse(readFileSync(path, 'utf8')) as SavedAnswer;
      const parsed = req.schema.safeParse(saved.output);
      if (parsed.success) {
        stats.reused++;
        return { output: parsed.data, usage: saved.usage } as CallResult<never>;
      }
      // The output format changed since it was saved: treat it as not saved.
    }
    if (options.offline) {
      stats.missing[settings.model] = (stats.missing[settings.model] ?? 0) + 1;
      console.log(`  not saved: ${req.call}, ${settings.model} run ${run}: ${req.user.replace(/\s+/g, ' ').slice(0, 90)}…`);
      throw new AiError(`No saved ${req.call} answer for this request.`, 'network');
    }
    const result = await base(req, settings);
    stats.bought++;
    stats.spent += result.usage.cost;
    mkdirSync(join(dir, settings.model, `run-${run}`), { recursive: true });
    writeFileSync(path, JSON.stringify({ call: req.call, output: result.output, usage: result.usage } satisfies SavedAnswer) + '\n');
    return result;
  };
}
