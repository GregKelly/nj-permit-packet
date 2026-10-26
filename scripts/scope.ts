// Writes the scope-of-work narrative for a test job from its confirmed facts
// (after follow-ups), and saves it for `npm run packet -- <id> --narrative`.
// Calls the Claude API (needs ANTHROPIC_API_KEY).
// Usage: npm run scope -- J-01 [--model haiku|sonnet|opus]

import { mkdirSync, writeFileSync } from 'node:fs';
import { determine } from '../src/engine';
import { AiError } from '../src/ai/client';
import { writeScope } from '../src/ai/scope';
import { loadRules } from '../src/rules-dir';
import { loadJob, TODAY } from '../tests/helpers';
import { idArg, modelArg } from './ai-shared';

const args = process.argv.slice(2);
const id = idArg(args);
if (!id?.startsWith('J-')) {
  console.error('Usage: npm run scope -- <J-01 … J-13> [--model haiku|sonnet|opus]');
  process.exit(1);
}
const job = loadJob(`${id}.yaml`);
const d = determine(job.after, loadRules(), TODAY);
try {
  const r = await writeScope(job.after, d, { settings: modelArg(args) });
  if (!r.paragraphs.length) {
    console.log(`No narrative: ${r.problems.join(' ')}\nThe packet's scope page keeps the plain list.`);
    process.exit(1);
  }
  console.log(`${id} scope of work${r.usage ? ` (${r.usage.model}, about $${r.usage.cost.toFixed(3)})` : ''}\n`);
  console.log(r.paragraphs.join('\n\n'));
  mkdirSync('out', { recursive: true });
  writeFileSync(`out/${id}.scope.json`, JSON.stringify({ paragraphs: r.paragraphs, model: r.usage?.model }, null, 2) + '\n');
  console.log(`\nSaved out/${id}.scope.json. Edit it if you like, then: npm run packet -- ${id} --narrative`);
} catch (error) {
  if (error instanceof AiError) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}
