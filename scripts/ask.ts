// Extracts one description, then shows the first round of follow-up questions
// as the contractor would see them. Calls the Claude API (needs ANTHROPIC_API_KEY).
// Usage: npm run ask -- J-03            (a test job)
//        npm run ask -- E-03            (an eval-only description)
//        npm run ask -- J-03 --model haiku

import { AiError } from '../src/ai/client';
import { extract, toFacts } from '../src/ai/extract';
import { openQuestions } from '../src/ai/flow';
import { phraseQuestions } from '../src/ai/questions';
import { evalOnlyJob, jobFromExtraction } from '../src/ai/eval/jobs';
import { alignItems, renameKey } from '../src/ai/eval/score';
import { loadRules } from '../src/rules-dir';
import { buildFacts, TODAY } from '../tests/helpers';
import { descriptionOf, directory, findJob, idArg, modelArg } from './ai-shared';

const args = process.argv.slice(2);
const id = idArg(args);
if (!id) {
  console.error('Usage: npm run ask -- <J-01 … J-13 or E-01 … E-10> [--model haiku|sonnet|opus]');
  process.exit(1);
}
const job = findJob(id);
const description = descriptionOf(job);
const settings = modelArg(args);
console.log(`${id}\n\n${description.trim()}\n`);

try {
  const r = await extract(description, { settings });
  if (!r.output) {
    console.log(`No usable extraction: ${r.problems.join(' ')}`);
    process.exit(1);
  }
  const ex = toFacts(r.output, directory);
  const raw = job.kind === 'test' ? jobFromExtraction(job.job.raw, ex) : evalOnlyJob(ex);
  const facts = buildFacts(raw);
  const asked = openQuestions(facts, loadRules(), TODAY, new Set());
  if (!asked.length) {
    console.log('No follow-up questions: the description gave everything the rules need.');
  } else {
    const q = await phraseQuestions(asked, facts, ex.quotes, { settings });
    console.log(`Follow-up questions, round 1${q.fallback ? ' (built-in wording: the AI answer failed its checks)' : ''}\n`);
    q.questions.forEach((w, n) => {
      console.log(`${n + 1}. ${w.text}   [${w.key}]`);
      for (const o of w.options) console.log(`     ( ) ${o.label}`);
      if (!w.options.length) console.log('     [ number ]');
    });
    if (q.problems.length) console.log(`\nProblems with the AI wording:\n${q.problems.map((p) => `  - ${p}`).join('\n')}`);
    const cost = (r.usage?.cost ?? 0) + (q.usage?.cost ?? 0);
    console.log(`\n(about $${cost.toFixed(3)} for both calls)`);
  }
  if (job.kind === 'test') {
    const matches = alignItems(facts.work_items, job.job.before.work_items);
    const got = asked.map((q) => renameKey(q.key, matches)).sort();
    const want = [...job.job.expected_questions].sort();
    console.log(`\nApproved follow-ups: ${want.join(', ') || 'none'}`);
    console.log(got.join() === want.join() ? 'Same questions as approved.' : `Engine asked:        ${got.join(', ') || 'none'}`);
  }
} catch (error) {
  if (error instanceof AiError) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}
