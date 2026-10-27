// The steps each screen triggers, as plain functions over saved jobs (M4 plan,
// "What gets built"). The screens stay thin; this is what the tests drive.
//
// Same division of labor as everywhere else: the AI extracts facts and words
// questions and the narrative, the engine decides, and the contractor confirms.
// Nothing here reads the clock: `today` comes in through the dependencies.

import { AiError, type CallOptions } from '../ai/client';
import { extract, toFacts, type NamedWorker } from '../ai/extract';
import { applyAnswers, openQuestions } from '../ai/flow';
import { fallbackQuestion, phraseQuestions, type WordedQuestion } from '../ai/questions';
import { writeScope } from '../ai/scope';
import type { Store } from '../db';
import { determine, parseJobFacts, UNKNOWN, type Determinations, type JobFacts, type Question, type RuleSet } from '../engine';
import { buildPacket } from '../packet/build';
import type { PacketJob } from '../packet/types';
import { unitsMismatch } from '../parcel/units';
import type { JobRecord, NewJob, RawFacts, TeamTrade } from './types';

export interface Deps {
  store: Store;
  /** Read on every step, so an edited rule file applies at once. */
  rules: () => RuleSet;
  /** "YYYY-MM-DD"; the app passes the computer's date, tests a fixed one. */
  today: () => string;
  /** The AI calls' transport and settings (tests replay saved answers). */
  ai?: CallOptions;
}

/** A step the contractor can't take yet; the message says why, in plain words. */
export class JobError extends Error {}

const TEAM_TRADES: TeamTrade[] = ['electrical', 'plumbing', 'hvacr'];
/** performed_by trades (the engine's) → the directory's trades. */
const TEAM_TRADE: Record<string, TeamTrade | null> = { building: null, electrical: 'electrical', plumbing: 'plumbing', mechanical: 'hvacr' };
/** Outcomes whose packet has a scope-of-work page, so a narrative is written or skipped first. */
const HAS_SCOPE = new Set(['permit', 'minor_work']);

export type Stage = 'questions' | 'review' | 'print' | 'printed';

export interface JobView {
  id: number;
  created: string;
  updated: string;
  job: JobRecord;
  facts: JobFacts;
  d: Determinations;
  stage: Stage;
  /** The open questions, worded (the AI's wording when there is one, else the built-in wording). */
  questions: WordedQuestion[];
  /** Names in the description that matched no subcontractor, still to be resolved. */
  names: NamedWorker[];
  /** The home type doesn't fit the tax record's unit count. */
  home_type_note: string | null;
  /** Confirmed under rules that have since changed: review again. */
  rules_changed: boolean;
  /** Why Confirm isn't possible yet; empty when it is. */
  blockers: string[];
  /** The packet needs a narrative decision (write, edit and approve, or use the plain list) before printing. */
  needs_scope: boolean;
}

export class Jobs {
  constructor(private readonly deps: Deps) {}

  private get store() {
    return this.deps.store;
  }

  // ── Reading ──────────────────────────────────────────────────────────────

  /** The engine's facts for a job: the site and home type, the job's facts, and the team from the directory. */
  facts(job: JobRecord): JobFacts {
    const profile = this.store.getProfile();
    if (!profile) throw new JobError('Set up your business details first.');
    const team: Record<string, unknown> = { applicant: { name: profile.name, hic_registration: profile.hic_registration } };
    for (const trade of TEAM_TRADES) {
      const id = job.team[trade];
      const sub = id == null ? null : this.store.getSub(id);
      if (sub) team[trade] = { name: sub.name, license: sub.license, expires: sub.expires };
    }
    const { site } = job;
    return parseJobFacts({
      property: {
        ...job.raw.property,
        municipality: site.municipality,
        address: site.street,
        block: site.block,
        lot: site.lot,
        ...(site.qualifier ? { qualifier: site.qualifier } : {}),
        prop_class: site.prop_class,
        year_built: site.year_built ?? UNKNOWN,
        // The contractor's pick on the Describe screen, never the AI's reading of the description.
        dwelling_type: job.home_type,
      },
      costs: job.raw.costs,
      performed_by: job.raw.performed_by,
      team,
      work_items: job.raw.work_items,
    });
  }

  view(id: number): JobView {
    const row = this.store.getJob<JobRecord>(id);
    if (!row) throw new JobError(`There's no job ${id}.`);
    const { job } = row;
    const facts = this.facts(job);
    const rules = this.deps.rules();
    const today = this.deps.today();
    const d = determine(facts, rules, today);
    const open = this.open(job, facts, rules);
    const questions = open.map((q) => job.wording.find((w) => w.key === q.key) ?? fallbackQuestion(q, facts));
    const names = this.unresolvedNames(job);
    const confirmed = job.confirmed !== null && job.confirmed.rules_version === d.rules_version;

    const blockers: string[] = [];
    if (questions.length || names.length) blockers.push('Answer the open questions first.');
    if (job.not_covered.length) blockers.push("Deal with the work Permit Packet can't classify: describe it as a work item, or remove it from this packet.");
    if (!facts.work_items.length) blockers.push('Add at least one work item.');
    for (const f of d.flags) if (f.blocks_printing) blockers.push(f.message);
    if (d.print_blocked && !d.flags.some((f) => f.blocks_printing)) blockers.push("This job can't be printed.");

    const stage: Stage = questions.length || names.length ? 'questions' : !confirmed ? 'review' : job.printed ? 'printed' : 'print';
    return {
      id,
      created: row.created,
      updated: row.updated,
      job,
      facts,
      d,
      stage,
      questions,
      names,
      home_type_note: unitsMismatch(job.home_type, job.site.dwelling_units),
      rules_changed: job.confirmed !== null && !confirmed,
      blockers,
      needs_scope: HAS_SCOPE.has(d.outcome),
    };
  }

  list() {
    return this.store.listJobs<JobRecord>().map((r) => {
      let stage: Stage | 'error';
      try {
        stage = this.view(r.id).stage;
      } catch {
        stage = 'error';
      }
      return { id: r.id, updated: r.updated, street: r.job.site.street, owner: r.job.owner.name, stage };
    });
  }

  // ── Steps ────────────────────────────────────────────────────────────────

  /** Describe screen → "Next": save the job, extract facts from the description, word the first questions. */
  async create(input: NewJob): Promise<JobView> {
    checkNew(input);
    const raw: RawFacts = { work_items: [], costs: {}, performed_by: {}, property: {} };
    const team: JobRecord['team'] = {};
    for (const sub of this.store.listSubs()) if (sub.usual) team[sub.trade] = sub.id;
    const job: JobRecord = {
      ...structuredClone(input),
      raw,
      team,
      ai: null,
      ai_note: null,
      ai_cost: 0,
      answers: {},
      declined: [],
      wording: [],
      names: {},
      not_covered: [],
      removed: [],
      confirmed: null,
      narrative: null,
      printed: null,
    };

    try {
      const r = await extract(input.description, this.deps.ai);
      job.ai_cost += r.usage?.cost ?? 0;
      if (r.output) {
        const ex = toFacts(r.output, this.store.directory());
        const { dwelling_type: _ignored, ...property } = ex.raw.property;
        job.raw = { work_items: ex.raw.work_items, costs: ex.raw.costs, performed_by: ex.raw.performed_by, property };
        for (const [trade, key] of Object.entries(ex.raw.team)) team[trade as TeamTrade] = Number(key);
        job.ai = { quotes: ex.quotes, named: ex.named };
        job.not_covered = ex.not_covered;
      } else {
        job.ai_note = `The AI's reading of the description failed its checks twice (${r.problems.join(' ')}). Enter the work items yourself.`;
      }
    } catch (error) {
      if (!(error instanceof AiError)) throw error;
      job.ai_note = `${error.message} Enter the work items yourself.`;
    }

    const id = this.store.insertJob(job, this.deps.today());
    await this.wordQuestions(id);
    return this.view(id);
  }

  /** Questions screen: answer some or all of the open questions; the engine then runs again. */
  async answer(id: number, answers: Record<string, unknown>): Promise<JobView> {
    const job = this.load(id);
    const open = new Map(this.open(job, this.facts(job), this.deps.rules()).map((q) => [q.key, q]));
    for (const [key, value] of Object.entries(answers)) {
      const q = open.get(key);
      if (!q) throw new JobError(`"${key}" isn't an open question.`);
      checkAnswer(q, value);
    }
    const next = applyAnswers({ ...job.raw }, answers);
    job.raw = next.raw as RawFacts;
    job.declined = [...new Set([...job.declined, ...next.declined])];
    job.answers = { ...job.answers, ...answers };
    this.unconfirm(job);
    this.save(id, job);
    await this.wordQuestions(id);
    return this.view(id);
  }

  /** Questions screen: a name from the description that isn't in the directory → a sub, or the owner doing the work. */
  resolveName(id: number, trade: string, choice: number | 'owner'): JobView {
    const job = this.load(id);
    const teamTrade = TEAM_TRADE[trade];
    if (!teamTrade || !this.unresolvedNames(job).some((n) => n.trade === trade)) throw new JobError(`No open name question for ${trade}.`);
    if (choice === 'owner') {
      job.raw.performed_by = { ...job.raw.performed_by, [trade]: 'owner' };
    } else {
      const sub = this.store.getSub(choice);
      if (!sub || sub.trade !== teamTrade) throw new JobError(`Pick a subcontractor for ${teamTrade} work.`);
      job.team = { ...job.team, [teamTrade]: choice };
    }
    job.names = { ...job.names, [trade]: choice };
    this.unconfirm(job);
    this.save(id, job);
    return this.view(id);
  }

  /** Review screen: change facts, team, owner, site or home type. Clears Confirm and the narrative approval. */
  edit(id: number, change: Partial<Pick<JobRecord, 'raw' | 'team' | 'owner' | 'site' | 'home_type'>>): JobView {
    const job = this.load(id);
    const next: JobRecord = { ...job, ...structuredClone(change) };
    if (change.site || change.owner || change.home_type) checkNew(next);
    try {
      this.facts(next);
    } catch (error) {
      if (error instanceof JobError) throw error;
      throw new JobError(`Those facts aren't valid: ${(error as Error).message}`);
    }
    this.unconfirm(next);
    this.save(id, next);
    return this.view(id);
  }

  /** Review screen: work the app can't classify is removed from this packet (listed on the cover checklist), or put back. */
  setNotCovered(id: number, text: string, action: 'remove' | 'restore'): JobView {
    const job = this.load(id);
    const [from, to] = action === 'remove' ? (['not_covered', 'removed'] as const) : (['removed', 'not_covered'] as const);
    if (!job[from].includes(text)) throw new JobError(`"${text}" isn't in the list.`);
    job[from] = job[from].filter((t) => t !== text);
    job[to] = [...job[to], text];
    this.unconfirm(job);
    this.save(id, job);
    return this.view(id);
  }

  /** Review screen → "Confirm": the contractor signs off on the facts and determinations. */
  confirm(id: number): JobView {
    const v = this.view(id);
    if (v.blockers.length) throw new JobError(v.blockers.join(' '));
    v.job.confirmed = { date: this.deps.today(), rules_version: v.d.rules_version };
    this.save(id, v.job);
    return this.view(id);
  }

  /** Print screen: the AI drafts the narrative from the confirmed facts only. */
  async draftScope(id: number): Promise<JobView> {
    const v = this.ready(id);
    if (!v.needs_scope) throw new JobError('This job has no scope-of-work page.');
    const r = await writeScope(v.facts, v.d, this.deps.ai);
    v.job.ai_cost += r.usage?.cost ?? 0;
    v.job.narrative = r.paragraphs.length
      ? { paragraphs: r.paragraphs, approved: false }
      : { paragraphs: [], approved: false, note: `The AI couldn't write a draft (${r.problems.join(' ')}). Write your own, or use the plain list.` };
    this.save(id, v.job);
    return this.view(id);
  }

  /** Print screen: approve the narrative as edited, or `null` to use the plain list instead. */
  approveScope(id: number, paragraphs: string[] | null): JobView {
    const v = this.ready(id);
    const kept = (paragraphs ?? []).map((p) => p.trim()).filter(Boolean);
    if (paragraphs !== null && !kept.length) throw new JobError('Write the scope of work, or choose the plain list.');
    v.job.narrative = { paragraphs: kept, approved: true };
    this.save(id, v.job);
    return this.view(id);
  }

  /** Print screen: edit the approved narrative again. The facts stay confirmed; the packet must be printed again. */
  reopenScope(id: number): JobView {
    const v = this.ready(id);
    if (!v.job.narrative?.approved) return v;
    v.job.narrative = { ...v.job.narrative, approved: false };
    v.job.printed = null;
    this.save(id, v.job);
    return this.view(id);
  }

  /** Print screen: the packet PDF. The first print is saved; printing again gives the same PDF until something changes. */
  async packet(id: number): Promise<{ pdf: Uint8Array; kind: 'packet' | 'no_permit' }> {
    const v = this.ready(id);
    const kind = v.d.outcome === 'no_permit' || v.d.outcome === 'zoning_only' ? 'no_permit' : 'packet';
    if (v.stage === 'printed') {
      const saved = this.store.getPacket(id);
      if (saved) return { pdf: saved, kind };
    }
    if (v.needs_scope && !v.job.narrative?.approved) throw new JobError('Approve the scope of work (or choose the plain list) first.');
    const today = this.deps.today();
    const result = await buildPacket(this.packetJob(v), v.d, this.store.packetProfile(), today);
    if (result.kind === 'none') throw new JobError(result.reason);
    this.store.savePacket(id, result.pdf, today);
    v.job.printed = { date: today, rules_version: v.d.rules_version };
    this.save(id, v.job);
    return { pdf: result.pdf, kind: result.kind };
  }

  /** The packet as it was printed, even if the rules have changed since; null if never printed. */
  printedPacket(id: number): Uint8Array | null {
    return this.store.getPacket(id);
  }

  /** What the packet builder gets for a job. */
  packetJob(v: JobView): PacketJob {
    const { site, owner, narrative, removed } = v.job;
    return {
      ref: owner.name,
      facts: v.facts,
      site: { block: site.block, lot: site.lot, ...(site.qualifier ? { qualifier: site.qualifier } : {}), zip: site.zip },
      owner,
      ...(narrative?.approved && narrative.paragraphs.length ? { scope_narrative: narrative.paragraphs } : {}),
      ...(removed.length ? { not_in_packet: removed } : {}),
    };
  }

  remove(id: number): void {
    this.store.deleteJob(id);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private load(id: number): JobRecord {
    const row = this.store.getJob<JobRecord>(id);
    if (!row) throw new JobError(`There's no job ${id}.`);
    return row.job;
  }

  private save(id: number, job: JobRecord) {
    this.store.updateJob(id, job, this.deps.today());
  }

  private open(job: JobRecord, facts: JobFacts, rules: RuleSet): Question[] {
    return openQuestions(facts, rules, this.deps.today(), new Set(job.declined));
  }

  private unresolvedNames(job: JobRecord): NamedWorker[] {
    return (job.ai?.named ?? []).filter((n) => !n.match && TEAM_TRADE[n.trade] && !(n.trade in job.names));
  }

  /** Confirmed, under the current rules. */
  private ready(id: number): JobView {
    const v = this.view(id);
    if (v.stage !== 'print' && v.stage !== 'printed') throw new JobError('Confirm the facts and determinations on the Review screen first.');
    return v;
  }

  /** Any change to the facts undoes the sign-off, so a packet can't mix old and new facts. */
  private unconfirm(job: JobRecord) {
    job.confirmed = null;
    job.printed = null;
    if (job.narrative) job.narrative = { ...job.narrative, approved: false };
  }

  /** Have the AI word any open questions that don't have its wording yet (the manual path keeps the built-in wording). */
  private async wordQuestions(id: number) {
    const job = this.load(id);
    if (!job.ai) return;
    const facts = this.facts(job);
    const open = this.open(job, facts, this.deps.rules());
    const missing = open.filter((q) => !job.wording.some((w) => w.key === q.key));
    if (!missing.length) return;
    const r = await phraseQuestions(missing, facts, job.ai.quotes, this.deps.ai);
    job.ai_cost += r.usage?.cost ?? 0;
    if (!r.fallback) job.wording = [...job.wording.filter((w) => open.some((q) => q.key === w.key)), ...r.questions];
    this.save(id, job);
  }
}

function checkNew(input: NewJob) {
  const missing: string[] = [];
  if (!input.site.street.trim()) missing.push('street address');
  if (!input.site.municipality.trim()) missing.push('town');
  if (!/^\d{5}$/.test(input.site.zip.trim())) missing.push('5-digit ZIP code');
  if (!input.site.block.trim() || !input.site.lot.trim()) missing.push('block and lot');
  if (!input.home_type) missing.push('home type');
  if (!input.owner.name.trim()) missing.push("owner's name");
  if (missing.length) throw new JobError(`Fill in the ${missing.join(', ')}.`);
}

function checkAnswer(q: Question, value: unknown) {
  if (value === UNKNOWN) return;
  if (q.options.length) {
    if (!q.options.includes(value as string)) throw new JobError(`"${String(value)}" isn't one of the answers for ${q.key}.`);
  } else if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new JobError(`${q.key} takes one number (an estimate is fine).`);
  } else if (!q.key.startsWith('costs.') && !Number.isInteger(value)) {
    throw new JobError(`${q.key} is a count: a whole number.`);
  }
}
