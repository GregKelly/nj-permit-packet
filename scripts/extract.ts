// Runs the extract call on one description and prints the facts in plain language,
// next to the answer key for a test job. Calls the Claude API (needs ANTHROPIC_API_KEY).
// Usage: npm run extract -- J-03            (a test job)
//        npm run extract -- E-01            (an eval-only description)
//        npm run extract -- J-03 --model haiku

import { AiError } from '../src/ai/client';
import { extract, toFacts } from '../src/ai/extract';
import { jobFromExtraction, evalOnlyJob } from '../src/ai/eval/jobs';
import { alignItems, scoreFacts } from '../src/ai/eval/score';
import { scoreFacts as scoreEvalOnly } from '../src/ai/eval/score-eval-only';
import { buildFacts, profile } from '../tests/helpers';
import { descriptionOf, directory, extrasLines, factLines, findJob, idArg, modelArg } from './ai-shared';

const args = process.argv.slice(2);
const id = idArg(args);
if (!id) {
  console.error('Usage: npm run extract -- <J-01 … J-13 or E-01 … E-10> [--model haiku|sonnet|opus]');
  process.exit(1);
}
const job = findJob(id);
const description = descriptionOf(job);
console.log(`${id}\n\n${description.trim()}\n`);

try {
  const r = await extract(description, { settings: modelArg(args) });
  if (r.usage) console.log(`(${r.usage.model}, ${r.attempts} ${r.attempts === 1 ? 'try' : 'tries'}, about $${r.usage.cost.toFixed(3)})\n`);
  if (!r.output) {
    console.log(`No usable answer: ${r.problems.join(' ')}`);
    process.exit(1);
  }
  if (r.problems.length) console.log(`Checks still failing after the retry:\n${r.problems.map((p) => `  - ${p}`).join('\n')}\n`);
  const ex = toFacts(r.output, directory);
  const raw = job.kind === 'test' ? jobFromExtraction(job.job.raw, ex) : evalOnlyJob(ex);
  const facts = buildFacts(raw);
  console.log('Extracted (? = unknown, to be asked)');
  console.log([...factLines(facts), ...extrasLines(ex)].join('\n'));

  if (job.kind === 'test') {
    console.log('\nAnswer key (facts before follow-ups)');
    console.log(factLines(job.job.before).join('\n'));
    const s = scoreFacts(facts, job.job.before, alignItems(facts.work_items, job.job.before.work_items), raw, job.job.raw, profile.default_team);
    printScore(s.guessed, s.wrong, s.missed, [...s.extra_items.map((i) => `extra item ${i}`), ...s.missing_items.map((i) => `missing item ${i}`)]);
  } else {
    const s = scoreEvalOnly(job.spec, ex, facts);
    printScore(s.guessed, s.wrong, s.missed, s.failed);
  }
} catch (error) {
  if (error instanceof AiError) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}

function printScore(guessed: { key: string; expected: unknown; got: unknown }[], wrong: typeof guessed, missed: typeof guessed, other: string[]) {
  const fmt = (d: (typeof guessed)[number]) => `${d.key}: expected ${JSON.stringify(d.expected)}, got ${JSON.stringify(d.got)}`;
  console.log('\nScore');
  console.log(`  Guessed facts: ${guessed.length}${guessed.map((d) => `\n    ${fmt(d)}`).join('')}`);
  console.log(`  Wrong facts:   ${wrong.length}${wrong.map((d) => `\n    ${fmt(d)}`).join('')}`);
  console.log(`  Missed facts:  ${missed.length}${missed.map((d) => `\n    ${fmt(d)}`).join('')}`);
  if (other.length) console.log(`  Other:${other.map((o) => `\n    ${o}`).join('')}`);
}
