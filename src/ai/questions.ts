// Call 2: the engine's question keys in, plain-language questions out (M3 plan).
// The engine decides which questions exist; this call only words them. Answers
// map back to the engine's fixed values, so rewording can't change a meaning.
// If the call fails or its answer fails the checks, the built-in wording is used.

import { readFileSync } from 'node:fs';
import { projectPath } from '../paths';
import type { JobFacts, Question } from '../engine';
import { UNKNOWN } from '../engine/facts';
import { answerValues, checkQuestions } from './checks';
import { AiError, send, totalUsage, type CallOptions, type Usage } from './client';
import { meaningFor } from './meanings';
import { QuestionsOutput } from './schema';

const PROMPT = readFileSync(projectPath('src', 'ai', 'prompts', 'questions.md'), 'utf8');

export interface WordedQuestion {
  key: string;
  text: string;
  /** Empty when the answer is a typed-in number (counts and costs). */
  options: { value: string; label: string }[];
}

const TRADE_NAMES: Record<string, string> = {
  total: 'the whole job',
  building: 'the building (general construction) work',
  electrical: 'the electrical work',
  plumbing: 'the plumbing and gas work',
  mechanical: 'the HVAC work',
};

const humanize = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** Plain built-in wording, used when the AI isn't available. Clunky, but the job can go ahead. */
export function fallbackQuestion(q: Question, facts: JobFacts): WordedQuestion {
  if (q.key.startsWith('costs.')) {
    return {
      key: q.key,
      text: `Estimated cost of ${TRADE_NAMES[q.fact] ?? q.fact}, in dollars? Enter one amount; an estimate is fine.`,
      options: [],
    };
  }
  const item = q.item_id ? facts.work_items.find((i) => i.id === q.item_id) : undefined;
  const subject = q.item_id ? item?.label ?? q.item_id : 'Property';
  const meaning = meaningFor(item ? item.kind : null, q.fact);
  const about = meaning?.asks ?? humanize(q.fact);
  return {
    key: q.key,
    text: q.options.length ? `${subject}: ${about}?` : `${subject}: ${about}? Enter one number.`,
    options: answerValues(q).map((v) => ({ value: v, label: v === UNKNOWN ? "Don't know" : meaning?.values?.[v] ?? humanize(v) })),
  };
}

export function questionsRequest(asked: Question[], facts: JobFacts, quotes: Record<string, string>, problems: string[] = []) {
  const list = asked.map((q) => {
    const item = q.item_id ? facts.work_items.find((i) => i.id === q.item_id) : undefined;
    const meaning = q.key.startsWith('costs.') ? undefined : meaningFor(item ? item.kind : null, q.fact);
    return {
      key: q.key,
      about: item?.label ?? (q.key.startsWith('costs.') ? 'Costs' : 'The property'),
      fact: q.fact,
      ...(meaning ? { means: meaning.asks } : {}),
      values: answerValues(q),
      ...(meaning?.values ? { value_meanings: meaning.values } : {}),
      ...(quotes[q.key] ? { quote: quotes[q.key] } : {}),
    };
  });
  const retry = problems.length ? `\n\nA previous answer had these problems. Fix them:\n${problems.map((p) => `- ${p}`).join('\n')}` : '';
  return { call: 'questions' as const, system: PROMPT, user: `Questions to word:\n\n${JSON.stringify(list, null, 2)}${retry}`, schema: QuestionsOutput };
}

export interface QuestionsResult {
  questions: WordedQuestion[];
  /** True when the built-in wording was used for every question. */
  fallback: boolean;
  /** Problems with the AI's last answer, or why it failed. Empty when it passed. */
  problems: string[];
  usage: Usage | null;
}

export async function phraseQuestions(asked: Question[], facts: JobFacts, quotes: Record<string, string>, options: CallOptions = {}): Promise<QuestionsResult> {
  if (!asked.length) return { questions: [], fallback: false, problems: [], usage: null };
  const usages: Usage[] = [];
  let problems: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await send(questionsRequest(asked, facts, quotes, problems), options);
      usages.push(result.usage);
      problems = checkQuestions(result.output, asked);
      if (!problems.length) {
        const byKey = new Map(result.output.questions.map((q) => [q.key, q]));
        return { questions: asked.map((q) => byKey.get(q.key)!), fallback: false, problems, usage: totalUsage(usages) };
      }
    } catch (error) {
      if (!(error instanceof AiError)) throw error;
      problems = [error.message];
      if (!['invalid', 'too_long'].includes(error.reason)) break;
    }
  }
  return { questions: asked.map((q) => fallbackQuestion(q, facts)), fallback: true, problems, usage: totalUsage(usages) };
}
