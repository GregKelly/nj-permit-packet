// The M3 evals (plan, "Evals and targets"). Runs every description through the
// real API, scores it, and writes the report. Costs money, so it's never part of
// `npm test`. Every answer bought is saved (src/ai/eval/saved.ts) and reused by
// later evals that send the same request, so only changed requests cost money.
//
// Usage: npm run eval -- --rescore                    (free: re-grade saved answers; says what's missing and its cost)
//        npm run eval                                 (all models, 3 runs each; buys only answers not saved)
//        npm run eval -- --models sonnet --runs 1     (quicker, cheaper)
//        npm run eval -- --jobs J-03,E-01             (only these descriptions)
//        npm run eval -- --record                     (also save Sonnet's run-1 answers for the offline tests)
//        npm run eval -- --dry-run                    (no API: answers with the answer key, to check the eval itself)
//
// Only a full eval (all three models, 3 runs, every description) writes
// docs/reports/m3-eval-report.md; a partial one writes next to its raw results in out/eval/.

import { mkdirSync, writeFileSync } from 'node:fs';
import { determine, type JobFacts, type RuleSet } from '../src/engine';
import { MODELS, SETTINGS, type Model } from '../src/ai/config';
import { AiError, type CallOptions, type Transport } from '../src/ai/client';
import { extract, toFacts } from '../src/ai/extract';
import { openQuestions } from '../src/ai/flow';
import { fallbackQuestion, phraseQuestions, type WordedQuestion } from '../src/ai/questions';
import { recordingTransport } from '../src/ai/replay';
import { newStats, savedTransport } from '../src/ai/eval/saved';
import { toWire } from '../src/ai/schema';
import { writeScope } from '../src/ai/scope';
import { answerKeyAsOutput, evalOnlyJob, jobFromExtraction } from '../src/ai/eval/jobs';
import { alignItems, playRounds, renameItems, renameKey, renameQuotes, scoreFacts, type FactDiff } from '../src/ai/eval/score';
import { scoreFacts as scoreEvalOnly, scoreFollowUps, type EvalOnlySpec } from '../src/ai/eval/score-eval-only';
import { loadRules } from '../src/rules-dir';
import { buildFacts, profile, TODAY, type JobFixture } from '../tests/helpers';
import { directory, loadEvalOnly, testJobs } from './ai-shared';

// ── Arguments ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const SHORT: Record<string, Model> = { haiku: 'claude-haiku-5-5', sonnet: 'claude-sonnet-5-5', opus: 'claude-opus-5-5' };
const models: Model[] = arg('models')?.split(',').map((m) => SHORT[m] ?? (m as Model)) ?? [...MODELS];
const runs = Number(arg('runs') ?? 3);
const only = arg('jobs')?.split(',');
const record = args.includes('--record');
const dryRun = args.includes('--dry-run');
const rescore = args.includes('--rescore');
const stats = newStats();
const rules: RuleSet = loadRules();

const jobs = testJobs().filter((j) => !only || only.includes(j.id));
const evalOnly = loadEvalOnly().filter((s) => !only || only.includes(s.id));
const SCOPE_SAMPLES = ['J-01', 'J-04', 'J-08', 'J-11'];

// ── Dry run: answer with the answer key, so a perfect AI must score perfectly ──

const dryRunTransport: Transport = async (req) => {
  const usage = { model: 'dry-run', input_tokens: 0, output_tokens: 0, cost: 0 };
  if (req.call === 'extract') {
    const job = jobs.find((j) => req.user.includes(j.raw.description.trim()));
    if (!job) throw new AiError('Dry run: no answer key for eval-only descriptions.', 'invalid');
    return { output: toWire(answerKeyAsOutput(job.raw, directory)), usage } as never;
  }
  if (req.call === 'questions') {
    const list = JSON.parse(req.user.slice(req.user.indexOf('['), req.user.lastIndexOf(']') + 1)) as { key: string; fact: string; values: string[]; quote?: string }[];
    const questions = list.map((q) => fallbackQuestion({ key: q.key, fact: q.fact, options: q.values.filter((v) => v !== 'unknown') }, { work_items: [] } as unknown as JobFacts));
    return { output: { questions }, usage } as never;
  }
  const input = JSON.parse(req.user.slice(req.user.indexOf('{'))) as { trades: { trade: string; items: { id: string; label: string }[] }[]; not_permitted: { id: string; label: string }[] };
  const sections = input.trades.map((t) => ({ trade: t.trade, sentences: t.items.map((i) => ({ text: i.label.replace(/\d/g, '#'), item_ids: [i.id] })) }));
  return { output: { sections }, usage } as never;
};

function transportFor(model: Model, run: number, id: string): Transport {
  if (dryRun) return dryRunTransport;
  const saved = savedTransport(run, stats, { offline: rescore });
  if (record && run === 1 && model === SETTINGS.extract.model) return recordingTransport(new URL(`../tests/ai/recordings/${id}`, import.meta.url).pathname, saved);
  return saved;
}

// ── One test job, one run ─────────────────────────────────────────────────────

interface TestRun {
  id: string;
  ok: boolean;
  error?: string;
  guessed: FactDiff[];
  wrong: FactDiff[];
  missed: FactDiff[];
  item_differences: string[];
  same_questions: boolean;
  questions_asked: string[];
  same_result: boolean;
  result_differences: string[];
  rounds: number;
  costs_exact: boolean;
  question_checks: string[];
  worded: WordedQuestion[];
  scope_checks: string[];
  scope: string[];
  cost: number;
}

async function runTestJob(job: JobFixture, model: Model, run: number): Promise<TestRun> {
  const opts: CallOptions = { transport: transportFor(model, run, job.id), settings: { model } };
  const base: TestRun = {
    id: job.id, ok: false, guessed: [], wrong: [], missed: [], item_differences: [], same_questions: false, questions_asked: [],
    same_result: false, result_differences: [], rounds: 0, costs_exact: false, question_checks: [], worded: [], scope_checks: [], scope: [], cost: 0,
  };
  const r = await extract(job.raw.description, opts);
  base.cost += r.usage?.cost ?? 0;
  if (!r.output) return { ...base, error: r.problems.join(' '), question_checks: ['No usable extraction.'] };
  if (r.problems.length) base.error = `Checks failed after retry: ${r.problems.join(' ')}`;

  const ex = toFacts(r.output, directory);
  const raw = jobFromExtraction(job.raw, ex);
  let facts: JobFacts;
  try {
    facts = buildFacts(raw);
  } catch (e) {
    return { ...base, error: `Extracted facts don't fit the schema: ${(e as Error).message}` };
  }
  const matches = alignItems(facts.work_items, job.before.work_items);
  const s = scoreFacts(facts, job.before, matches, raw, job.raw, profile.default_team);
  const renamed = renameItems(raw, matches);
  const renamedFacts = buildFacts(renamed);
  const asked = openQuestions(renamedFacts, rules, TODAY, new Set());
  const keys = asked.map((q) => q.key).sort();
  const rounds = playRounds(renamed, job.after, determine(job.after, rules, TODAY), buildFacts, rules, TODAY);

  // Questions: word round 1 for the extracted facts, with the AI's quotes.
  const q = await phraseQuestions(asked, renamedFacts, renameQuotes(ex.quotes, matches), opts);
  base.cost += q.usage?.cost ?? 0;

  // Scope: from the confirmed facts (the answer key after follow-ups), for jobs with a packet.
  const d = determine(job.after, rules, TODAY);
  let scopeChecks: string[] = [];
  let scope: string[] = [];
  if (['permit', 'minor_work'].includes(d.outcome) && !d.print_blocked) {
    const sc = await writeScope(job.after, d, opts);
    base.cost += sc.usage?.cost ?? 0;
    scopeChecks = sc.problems;
    scope = sc.paragraphs;
  }

  return {
    ...base,
    ok: !base.error,
    guessed: s.guessed,
    wrong: s.wrong,
    missed: s.missed,
    item_differences: [...s.extra_items.map((i) => `extra item ${i}`), ...s.missing_items.map((i) => `missing item ${i}`)],
    same_questions: keys.join() === [...job.expected_questions].sort().join(),
    questions_asked: keys,
    same_result: rounds.differences.length === 0,
    result_differences: rounds.differences,
    rounds: rounds.rounds.length,
    costs_exact: ![...s.guessed, ...s.wrong, ...s.missed].some((d) => d.key.startsWith('costs.')),
    question_checks: q.fallback ? q.problems : [],
    worded: q.questions,
    scope_checks: scopeChecks,
    scope,
  };
}

// ── One eval-only description, one run ────────────────────────────────────────

interface EvalOnlyRun {
  id: string;
  ok: boolean;
  error?: string;
  guessed: FactDiff[];
  wrong: FactDiff[];
  missed: FactDiff[];
  failed: string[];
  follow_up_failures: string[];
  question_checks: string[];
  worded: WordedQuestion[];
  cost: number;
}

async function runEvalOnly(spec: EvalOnlySpec, model: Model, run: number): Promise<EvalOnlyRun> {
  const opts: CallOptions = { transport: transportFor(model, run, spec.id), settings: { model } };
  const base: EvalOnlyRun = { id: spec.id, ok: false, guessed: [], wrong: [], missed: [], failed: [], follow_up_failures: [], question_checks: [], worded: [], cost: 0 };
  const r = await extract(spec.description, opts);
  base.cost += r.usage?.cost ?? 0;
  if (!r.output) return { ...base, error: r.problems.join(' '), failed: ['No usable extraction.'], follow_up_failures: spec.follow_ups ? ['No usable extraction.'] : [], question_checks: ['No usable extraction.'] };
  const ex = toFacts(r.output, directory);
  let facts: JobFacts;
  try {
    facts = buildFacts(evalOnlyJob(ex));
  } catch (e) {
    return { ...base, error: `Extracted facts don't fit the schema: ${(e as Error).message}` };
  }
  const s = scoreEvalOnly(spec, ex, facts);
  let worded: WordedQuestion[] = [];
  let questionChecks: string[] = [];
  if (spec.follow_ups?.length) {
    const asked = openQuestions(facts, rules, TODAY, new Set());
    const q = await phraseQuestions(asked, facts, ex.quotes, opts);
    base.cost += q.usage?.cost ?? 0;
    worded = q.questions;
    questionChecks = q.fallback ? q.problems : [];
    base.follow_up_failures = scoreFollowUps(spec, asked, facts, ex.quotes, q.fallback ? null : worded);
  }
  return {
    ...base,
    ok: !r.problems.length,
    error: r.problems.length ? `Checks failed after retry: ${r.problems.join(' ')}` : undefined,
    ...s,
    question_checks: questionChecks,
    worded,
  };
}

// ── Run everything ────────────────────────────────────────────────────────────

async function pool<T>(tasks: (() => Promise<T>)[], size = 4): Promise<T[]> {
  const out: T[] = new Array(tasks.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, tasks.length) }, async () => {
      while (next < tasks.length) {
        const i = next++;
        out[i] = await tasks[i]();
      }
    }),
  );
  return out;
}

const results: Record<string, { test: TestRun[][]; evalOnly: EvalOnlyRun[][] }> = {};
for (const model of dryRun ? (['dry-run'] as unknown as Model[]) : models) {
  results[model] = { test: [], evalOnly: [] };
  for (let run = 1; run <= runs; run++) {
    console.log(`${model}, run ${run} of ${runs}…`);
    const m = dryRun ? SETTINGS.extract.model : model;
    const settle = <T>(id: string, f: () => Promise<T>, empty: T) =>
      f().catch((e) => {
        if (e instanceof AiError) return { ...empty, id, error: e.message } as T;
        throw e;
      });
    const failed = ['No usable answer.'];
    const blankTest = { ok: false, guessed: [], wrong: [], missed: [], item_differences: [], same_questions: false, questions_asked: [], same_result: false, result_differences: [], rounds: 0, costs_exact: false, question_checks: failed, worded: [], scope_checks: [], scope: [], cost: 0 } as unknown as TestRun;
    const blankEval = { ok: false, guessed: [], wrong: [], missed: [], failed, follow_up_failures: failed, question_checks: failed, worded: [], cost: 0 } as unknown as EvalOnlyRun;
    let done = 0;
    const total = jobs.length + (dryRun ? 0 : evalOnly.length);
    const tick = <T>(id: string, f: () => Promise<T>) => async () => {
      const r = await f();
      console.log(`  ${String(++done).padStart(2)}/${total} ${id}`);
      return r;
    };
    results[model].test.push(await pool(jobs.map((j) => tick(j.id, () => settle(j.id, () => runTestJob(j, m, run), blankTest)))));
    if (!dryRun) results[model].evalOnly.push(await pool(evalOnly.map((s) => tick(s.id, () => settle(s.id, () => runEvalOnly(s, m, run), blankEval)))));
  }
}

const missing = Object.entries(stats.missing);
if (missing.length) {
  // Re-grading needs every answer saved; a partial set would grade missing answers as failures.
  // A missing extraction hides the calls after it, so a whole job is priced per missing answer.
  const perJob = (model: string) => {
    const xs = [...results[model].test.flat(), ...results[model].evalOnly.flat()].filter((x) => x.cost > 0);
    return xs.length ? xs.reduce((a, x) => a + x.cost, 0) / xs.length : 0.05;
  };
  const cost = missing.reduce((a, [model, n]) => a + n * perJob(model), 0);
  console.log(`\nNot every answer is saved: ${missing.map(([m, n]) => `${n} missing for ${m}`).join(', ')}.`);
  console.log(`No report written. Run without --rescore to buy only the missing answers: at most about $${cost.toFixed(2)}.`);
  process.exit(1);
}

mkdirSync('out/eval', { recursive: true });
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
writeFileSync(`out/eval/${stamp}.json`, JSON.stringify({ models, runs, results }, null, 2));


// ── Report ────────────────────────────────────────────────────────────────────

const yes = (b: boolean) => (b ? '✅' : '❌');
const money = (n: number) => `$${n.toFixed(n < 1 ? 3 : 2)}`;
const fmt = (d: FactDiff) => `\`${d.key}\`: expected ${JSON.stringify(d.expected)}, got ${JSON.stringify(d.got)}`;
const lines: string[] = [];
const L = (s = '') => lines.push(s);

L('# M3 eval report');
L();
L(`*Generated ${new Date().toISOString().slice(0, 10)} by \`npm run eval${args.length ? ` -- ${args.join(' ')}` : ''}\`. ${runs} run(s) per model. Test jobs: ${jobs.length}; eval-only descriptions: ${dryRun ? 0 : evalOnly.length}. ${dryRun ? '**Dry run: the answers are the answer key, so this checks the eval, not the AI.**' : ''}*`);
L();
L('Targets are from the approved [M3 plan](../plans/m3-plan.md) ("Evals and targets"). Scores are the worst over all runs, except missed facts, which are an average.');
L();

const header = ['Target', ...Object.keys(results)];
const rows: string[][] = [];
const per = (fn: (r: (typeof results)[string]) => string) => Object.values(results).map(fn);
const allTest = (r: (typeof results)[string]) => r.test.flat();
const allEval = (r: (typeof results)[string]) => r.evalOnly.flat();
const jobRuns = (r: (typeof results)[string]) => allTest(r).length + allEval(r).length;

rows.push(['**Guessed facts: zero, every run**', ...per((r) => { const n = [...allTest(r), ...allEval(r)].reduce((a, x) => a + x.guessed.length, 0); return `${yes(n === 0)} ${n}`; })]);
rows.push(['Wrong facts: zero', ...per((r) => { const n = [...allTest(r), ...allEval(r)].reduce((a, x) => a + x.wrong.length, 0); return `${yes(n === 0)} ${n}`; })]);
rows.push(['Missed facts: at most 1 per job on average', ...per((r) => { const n = [...allTest(r), ...allEval(r)].reduce((a, x) => a + x.missed.length, 0) / Math.max(1, jobRuns(r)); return `${yes(n <= 1)} ${n.toFixed(2)}`; })]);
rows.push(['Same questions: every job, every run', ...per((r) => { const t = allTest(r); const n = t.filter((x) => x.same_questions).length; return `${yes(n === t.length)} ${n}/${t.length}`; })]);
rows.push(['Same result: every job, every run', ...per((r) => { const t = allTest(r); const n = t.filter((x) => x.same_result).length; return `${yes(n === t.length)} ${n}/${t.length}`; })]);
rows.push(['Costs extracted exactly: every job', ...per((r) => { const t = allTest(r); const n = t.filter((x) => x.costs_exact).length; return `${yes(n === t.length)} ${n}/${t.length}`; })]);
if (!dryRun) rows.push(['Flags, names, not-covered work: every eval-only case', ...per((r) => { const e = allEval(r); const n = e.filter((x) => !x.failed.length).length; return `${yes(n === e.length)} ${n}/${e.length}`; })]);
if (!dryRun) rows.push(['Follow-ups quote the description (E-01, E-03, E-04)', ...per((r) => { const e = allEval(r).filter((x) => evalOnly.find((s) => s.id === x.id)?.follow_ups); const n = e.filter((x) => !x.follow_up_failures.length).length; return `${yes(n === e.length)} ${n}/${e.length}`; })]);
rows.push(['Question checks pass: every run', ...per((r) => { const t = [...allTest(r), ...allEval(r)]; const n = t.filter((x) => !x.question_checks.length).length; return `${yes(n === t.length)} ${n}/${t.length}`; })]);
rows.push(['Scope checks pass: every run', ...per((r) => { const t = allTest(r).filter((x) => x.scope.length || x.scope_checks.length); const n = t.filter((x) => !x.scope_checks.length).length; return `${yes(n === t.length)} ${n}/${t.length}`; })]);
rows.push(['Answers that failed outright (no usable answer)', ...per((r) => { const n = [...allTest(r), ...allEval(r)].filter((x) => x.error && !x.ok).length; return `${yes(n === 0)} ${n}`; })]);
rows.push(['Cost per job, all three calls (average)', ...per((r) => money([...allTest(r), ...allEval(r)].reduce((a, x) => a + x.cost, 0) / Math.max(1, jobRuns(r))))]);
rows.push(['Cost of these answers (when first bought)', ...per((r) => money([...allTest(r), ...allEval(r)].reduce((a, x) => a + x.cost, 0)))]);

L(`| ${header.join(' | ')} |`);
L(`|${header.map(() => '---').join('|')}|`);
for (const row of rows) L(`| ${row.join(' | ')} |`);
L();

L('## Failures');
L();
let any = false;
for (const [model, r] of Object.entries(results)) {
  r.test.forEach((runResults, i) => {
    for (const x of runResults) {
      const items = [
        ...(x.error ? [`Error: ${x.error}`] : []),
        ...x.guessed.map((d) => `Guessed ${fmt(d)}`),
        ...x.wrong.map((d) => `Wrong ${fmt(d)}`),
        ...x.missed.map((d) => `Missed ${fmt(d)}`),
        ...x.item_differences,
        ...(x.same_questions ? [] : [`Questions asked: ${x.questions_asked.join(', ') || 'none'}; approved: ${jobs.find((j) => j.id === x.id)!.expected_questions.join(', ') || 'none'}`]),
        ...x.result_differences.map((d) => `Result: ${d}`),
        ...x.question_checks.map((p) => `Question wording: ${p}`),
        ...x.scope_checks.map((p) => `Scope: ${p}`),
      ];
      if (!items.length) continue;
      any = true;
      L(`**${x.id}** · ${model} · run ${i + 1}`);
      L();
      L(`> ${jobs.find((j) => j.id === x.id)!.raw.description.trim()}`);
      L();
      for (const it of items) L(`- ${it}`);
      L();
    }
  });
  r.evalOnly.forEach((runResults, i) => {
    for (const x of runResults) {
      const items = [
        ...(x.error ? [`Error: ${x.error}`] : []),
        ...x.guessed.map((d) => `Guessed ${fmt(d)}`),
        ...x.wrong.map((d) => `Wrong ${fmt(d)}`),
        ...x.missed.map((d) => `Missed ${fmt(d)}`),
        ...x.failed,
        ...x.follow_up_failures,
        ...x.question_checks.map((p) => `Question wording: ${p}`),
      ];
      if (!items.length) continue;
      any = true;
      L(`**${x.id}** · ${model} · run ${i + 1}`);
      L();
      L(`> ${evalOnly.find((s) => s.id === x.id)!.description.trim()}`);
      L();
      for (const it of items) L(`- ${it}`);
      L();
    }
  });
}
if (!any) L('None.');
L();

L('## Sample follow-up questions (run 1)');
L();
for (const [model, r] of Object.entries(results)) {
  L(`### ${model}`);
  L();
  for (const x of [...(r.test[0] ?? []), ...(r.evalOnly[0] ?? [])]) {
    if (!x.worded.length) continue;
    L(`**${x.id}**`);
    L();
    for (const w of x.worded) L(`- ${w.text}${w.options.length ? ` *(${w.options.map((o) => o.label).join(' / ')})*` : ' *(number)*'}`);
    L();
  }
}

L('## Sample scope narratives (run 1)');
L();
for (const id of SCOPE_SAMPLES) {
  if (!jobs.some((j) => j.id === id)) continue;
  L(`### ${id}`);
  L();
  for (const [model, r] of Object.entries(results)) {
    const x = r.test[0]?.find((t) => t.id === id);
    L(`**${model}**`);
    L();
    for (const p of x?.scope.length ? x.scope : ['(no narrative: ' + (x?.scope_checks.join(' ') || x?.error || 'not run') + ')']) L(`> ${p}\n>`);
    L();
  }
}

const full = !dryRun && !only && runs === 3 && MODELS.every((m) => models.includes(m));
mkdirSync('docs/reports', { recursive: true });
const report = dryRun ? 'out/eval/dry-run-report.md' : full ? 'docs/reports/m3-eval-report.md' : `out/eval/${stamp}-report.md`;
writeFileSync(report, lines.join('\n'));
console.log(`\nWrote ${report} (raw results: out/eval/${stamp}.json)${full || dryRun ? '' : '. Partial eval, so the official report is unchanged.'}`);
console.log(rows.map((r) => `  ${r[0].replace(/\*/g, '')}: ${r.slice(1).join(' | ')}`).join('\n'));
if (!dryRun) console.log(`\nAnswers reused: ${stats.reused}; bought: ${stats.bought}. Spent this time: $${stats.spent.toFixed(2)}.`);
