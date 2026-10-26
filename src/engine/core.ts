// The engine's decision steps, in the order of rules table §1. Facts in,
// determinations out; no I/O, no clock ("today" is passed in).

import { TRADES, UNKNOWN, type JobFacts, type Trade, type WorkItem } from './facts';
import type { Cond, FormDef, ItemRule, LicensingRule, OwnerTrade, RuleSet, ThenPart } from './load';
import { matchProperty, matchWhen } from './match';
import type {
  Determinations,
  FillIn,
  Flag,
  FormDetermination,
  FormEntries,
  FormLine,
  HeatingSystem,
  ItemDetermination,
  Note,
  OwnerTradeDetermination,
  PlansDetermination,
  Tier,
  ZoningDetermination,
} from './types';

const TIER_RANK: Record<Tier, number> = { OM: 0, MW: 1, FULL: 2 };
const TRADE_PERSON: Record<string, string> = { electrical: 'electrician', plumbing: 'plumber', hvacr: 'HVACR contractor' };
const TRADE_LICENSE: Record<string, string> = { electrical: 'electrical', plumbing: 'plumbing', hvacr: 'HVACR' };
const FUEL_LABEL: Record<string, string> = { gas: 'Gas', oil: 'Oil', propane: 'Propane', electric: 'Electric' };
/** Owner-performed trades → the subcontractor directory entry for that trade. */
const TEAM_KEY: Record<OwnerTrade, 'electrical' | 'plumbing' | 'hvacr'> = { electrical: 'electrical', plumbing: 'plumbing', mechanical: 'hvacr' };
const OWNER = 'Owner';

interface Classified {
  item: WorkItem;
  det: ItemDetermination;
  rule?: ItemRule;
  then?: ThenPart;
}

/** Everything `determine` returns except questions, plus what question selection needs. */
export interface Evaluation {
  d: Determinations;
  presentTrades: Trade[];
  remainderTrade: Trade | null;
}

export function evaluate(facts: JobFacts, rules: RuleSet, today: string): Evaluation {
  const property = facts.property as Record<string, unknown>;
  const d: Determinations = {
    outcome: 'no_permit',
    job_tier: null,
    items: [],
    forms: [],
    zoning: null,
    plans: null,
    tips: [],
    submission: [],
    flags: [],
    owner_trades: [],
    owner_notes: [],
    form_entries: {},
    fill_ins: [],
    questions: [],
    assumptions_applied: [],
    office_questions: [],
    print_blocked: false,
    rules_version: rules.version,
    today,
  };
  const none: Evaluation = { d, presentTrades: [], remainderTrade: null };
  const stop = (flag: Flag): Evaluation => {
    d.outcome = 'out_of_scope';
    d.flags = [flag];
    d.print_blocked = true;
    return none;
  };

  // 1. Scope check.
  for (const s of rules.scope) {
    if (!matchProperty(s.property, property)) return stop({ id: s.id, message: s.message, blocks_printing: true });
  }
  if (facts.performed_by.building !== 'contractor') {
    const lc = licensingRule(rules, 'owner_building_work');
    return stop({ id: lc.id, message: lc.message, blocks_printing: true });
  }

  // 2–3. Classify each work item on its own.
  const classified = facts.work_items.map((item) => classify(item, property, rules));
  d.items = classified.map((c) => c.det);

  const stopper = classified.find((c) => c.then?.stop);
  if (stopper) return stop({ id: stopper.det.rule_id!, message: stopper.then!.stop!, blocks_printing: true });
  if (classified.some((c) => !c.det.rule_id)) {
    d.outcome = 'cannot_classify';
    d.print_blocked = true;
    return none;
  }

  // 4. Job tier: the highest item tier.
  const tier = classified.reduce<Tier>((t, c) => (TIER_RANK[c.det.tier!] > TIER_RANK[t] ? c.det.tier! : t), 'OM');
  d.job_tier = tier;
  const permitted = classified.filter((c) => c.det.tier !== 'OM');

  // 5. Trades the owner does themselves: may they? (rules table §4.7)
  const owner = tier === 'OM' ? null : ownerTrades(facts, permitted, property, rules);
  const ownerTrade = (form: string) => owner?.trades.find((t) => rules.homeowner.trades[t.trade].forms.includes(form));
  if (owner) d.owner_trades = owner.trades.map(({ trade, allowed, rule_id }) => ({ trade, allowed, rule_id }));

  // 6. Forms and signers.
  const formIds = new Set<string>();
  if (tier !== 'OM') {
    formIds.add('F100');
    for (const c of permitted) c.det.forms.forEach((f) => formIds.add(f));
  }
  const formDefs = rules.forms.filter((f) => formIds.has(f.id));
  d.forms = formDefs.map((f) => {
    const form: FormDetermination = { form: f.id, name: f.name, signer_role: f.signer, signer: signerFor(f, facts) };
    const t = ownerTrade(f.id);
    if (t) form.signer = t.allowed ? OWNER : null; // HO-F3, HO-F4; no eligible signer when a check failed
    if (f.id === 'F100' && owner?.trades.length) form.signer = OWNER; // HO-F1: the owner is the applicant
    if (form.signer === OWNER) form.by_owner = true;
    return form;
  });

  // 7. Zoning prior approval.
  d.zoning = zoning(classified, property, rules, tier);

  // 8. Plans.
  d.plans = plans(classified, rules);

  // Reviewer tips (non-blocking).
  d.tips = tips(classified, property, rules);

  // Submitting the packet (cover checklist).
  const submission = tier === 'OM' ? [] : rules.submission.filter((s) => !s.when_plans || s.when_plans.includes(d.plans!.requirement));
  d.submission = submission.map((s) => ({ id: s.id, text: s.text }));

  // 9. Work type, cost and quantities.
  const entries = tier === 'OM' ? null : formEntries(facts, classified, permitted, d.forms, formDefs, rules, tier, owner?.trades ?? []);
  if (entries) {
    d.form_entries = entries.entries;
    d.fill_ins = entries.fillIns;
  }

  // 10. License and registration checks, then the owner's eligibility (§4.7).
  if (tier !== 'OM') d.flags = [...licensingFlags(facts, d.forms.filter((f) => !ownerTrade(f.form)), rules, today), ...(owner?.flags ?? [])];
  if (owner) d.owner_notes = ownerNotes(owner.trades, d.form_entries, rules);

  d.outcome =
    tier === 'FULL' ? 'permit' : tier === 'MW' ? 'minor_work' : d.zoning?.status === 'required' ? 'zoning_only' : 'no_permit';
  d.print_blocked = d.flags.some((f) => f.blocks_printing);

  // What the determinations rest on.
  const assumptionIds = new Set<string>(['A-1']);
  const questionIds = new Set<string>();
  for (const c of classified) {
    c.det.assumptions.forEach((a) => assumptionIds.add(a));
    c.det.office_questions.forEach((q) => questionIds.add(q));
  }
  for (const f of formDefs) {
    f.assumptions.forEach((a) => assumptionIds.add(a));
    f.office_questions.forEach((q) => questionIds.add(q));
  }
  d.zoning?.assumptions.forEach((a) => assumptionIds.add(a));
  d.plans?.assumptions.forEach((a) => assumptionIds.add(a));
  for (const q of rules.plans.find((p) => p.id === d.plans?.rule_id)?.office_questions ?? []) questionIds.add(q);
  entries?.assumptions.forEach((a) => assumptionIds.add(a));
  submission.forEach((s) => s.assumptions.forEach((a) => assumptionIds.add(a)));
  entries?.officeQuestions.forEach((q) => questionIds.add(q));
  owner?.assumptions.forEach((a) => assumptionIds.add(a));
  owner?.officeQuestions.forEach((q) => questionIds.add(q));

  d.assumptions_applied = sortIds([...assumptionIds]).map((id) => {
    const a = rules.assumptions.get(id)!;
    return { id, text: a.text, confirm_with: a.confirm_with };
  });
  d.office_questions = sortIds([...questionIds])
    .map((id) => rules.officeQuestions.get(id)!)
    .filter((q) => q.status === 'open')
    .map((q) => ({ id: q.id, text: q.text }));

  return { d, presentTrades: entries?.presentTrades ?? [], remainderTrade: entries?.remainderTrade ?? null };
}

// ---------------------------------------------------------------------------

function classify(item: WorkItem, property: Record<string, unknown>, rules: RuleSet): Classified {
  const base = { item_id: item.id, label: item.label, kind: item.kind };
  for (const rule of rules.itemRules) {
    const m = matchWhen(rule.when, item, property);
    if (!m.ok) continue;
    let then = rule.then;
    let reason = rule.reason;
    let citation = rule.citation;
    const assumptions = [...rule.assumptions];
    const unknowns = [...m.unknowns];
    if (rule.cases) {
      const found = rule.cases.map((c) => ({ c, m: c.when ? matchWhen(c.when, item, property) : { ok: true, unknowns: [] } })).find((x) => x.m.ok);
      if (!found) {
        return { item, det: unclassified(base, `${rule.id} applies, but none of its cases match`) };
      }
      then = found.c.then;
      reason = found.c.reason ?? reason;
      citation = found.c.citation ?? citation;
      assumptions.push(...found.c.assumptions);
      unknowns.push(...found.m.unknowns);
    }
    return {
      item,
      rule,
      then,
      det: {
        ...base,
        rule_id: rule.id,
        tier: then!.tier,
        reason,
        ...(citation ? { citation } : {}),
        forms: then!.tier === 'OM' ? [] : then!.forms,
        assumptions,
        office_questions: [...rule.office_questions],
        assumed_unknown: [...new Set(unknowns)],
      },
    };
  }
  return { item, det: unclassified(base, "Can't classify this item. Call the office to ask how it should be filed.") };
}

function unclassified(base: Pick<ItemDetermination, 'item_id' | 'label' | 'kind'>, error: string): ItemDetermination {
  return { ...base, rule_id: null, tier: null, reason: '', forms: [], assumptions: [], office_questions: [], assumed_unknown: [], error };
}

function signerFor(form: FormDef, facts: JobFacts): string | null {
  const applicant = facts.team.applicant.name;
  switch (form.signer) {
    case 'owner_or_agent':
      return `Owner, or ${applicant} as agent`;
    case 'applicant':
      return applicant;
    case 'none':
      return null;
    default:
      return facts.team[form.signer]?.name ?? null;
  }
}

function zoning(classified: Classified[], property: Record<string, unknown>, rules: RuleSet, tier: Tier): ZoningDetermination {
  const byRole = (role: string) => rules.zoning.find((z) => z.role === role)!;
  const flag = (name?: string) => (name ? rules.config.flags[name] === true : false);
  const change = byRole('exterior_change');
  const matches = classified.map((c) => matchWhen(change.triggers!, c.item, property)).filter((m) => m.ok);
  const required = (rule = change): Omit<ZoningDetermination, 'assumed_unknown' | 'rule_id'> => ({
    status: 'required',
    message: rule.message,
    checklist: change.checklist,
    assumptions: rule.assumptions,
  });

  if (matches.length) {
    const viaUnknown = matches.every((m) => m.unknowns.length > 0);
    const z = { rule_id: change.id, ...required(), assumed_unknown: viaUnknown };
    if (viaUnknown) z.message = `${z.message} ${byRole('unknown_trigger').message}`;
    return z;
  }
  const like = byRole('exterior_like_for_like');
  if (classified.some((c) => matchWhen(like.triggers!, c.item, property).ok)) {
    if (flag(like.config_flag)) return { rule_id: like.id, ...required(like), message: change.message, assumed_unknown: false };
    return { rule_id: like.id, status: like.status!, message: like.message, checklist: [], assumptions: like.assumptions, assumed_unknown: false };
  }
  const interior = byRole('interior');
  if (flag(interior.config_flag) && tier !== 'OM') return { rule_id: interior.id, ...required(interior), message: change.message, assumed_unknown: false };
  return { rule_id: interior.id, status: interior.status!, message: interior.message, checklist: [], assumptions: interior.assumptions, assumed_unknown: false };
}

function plans(classified: Classified[], rules: RuleSet): PlansDetermination {
  const ruleIds = new Set(classified.map((c) => c.det.rule_id));
  for (const p of rules.plans) {
    const because = p.when_rules.filter((id) => ruleIds.has(id));
    if (because.length || p.otherwise) {
      return { rule_id: p.id, requirement: p.requirement, message: p.message, because, assumptions: p.assumptions };
    }
  }
  throw new Error('plans: no rule applied'); // the checker guarantees an `otherwise` rule
}

function tips(classified: Classified[], property: Record<string, unknown>, rules: RuleSet): Note[] {
  return rules.tips
    .filter((t) =>
      t.when_item ? classified.some((c) => matchWhen(t.when_item!, c.item, property).ok) : matchProperty(t.when_property!, property),
    )
    .map((t) => ({ id: t.id, text: t.text }));
}

function licensingRule(rules: RuleSet, check: LicensingRule['check']): LicensingRule {
  return rules.licensing.find((r): r is LicensingRule => 'check' in r && r.check === check)!;
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? `{${k}}`);
}

function licensingFlags(facts: JobFacts, forms: FormDetermination[], rules: RuleSet, today: string): Flag[] {
  const flags: Flag[] = [];
  const add = (r: LicensingRule, values: Record<string, string> = {}) =>
    flags.push({ id: r.id, message: fill(r.message, values), blocks_printing: r.blocks_printing });

  if (!facts.team.applicant.hic_registration) add(licensingRule(rules, 'hic_missing'));
  const seen = new Set<string>();
  for (const f of forms) {
    const trade = f.signer_role;
    if (!(trade in TRADE_PERSON) || seen.has(trade)) continue;
    seen.add(trade);
    const sub = facts.team[trade as 'electrical' | 'plumbing' | 'hvacr'];
    if (!sub) add(licensingRule(rules, 'sub_missing'), { trade_person: TRADE_PERSON[trade], form: f.form });
    else if (sub.expires < today) add(licensingRule(rules, 'license_expired'), { name: sub.name, trade: TRADE_LICENSE[trade], expires: sub.expires });
  }
  return flags;
}

// ---------------------------------------------------------------------------
// Homeowner trade work (rules table §4.7)

interface OwnerTradeResult extends OwnerTradeDetermination {
  trade: OwnerTrade;
}

/**
 * For each licensed trade the owner does all or some of, run the checks in order;
 * the first that fails blocks printing for that trade.
 */
function ownerTrades(facts: JobFacts, permitted: Classified[], property: Record<string, unknown>, rules: RuleSet) {
  const h = rules.homeowner;
  const trades: OwnerTradeResult[] = [];
  const flags: Flag[] = [];
  const assumptions = new Set<string>();
  const officeQuestions = new Set<string>();

  for (const [trade, def] of Object.entries(h.trades) as [OwnerTrade, (typeof h.trades)[OwnerTrade]][]) {
    const who = facts.performed_by[trade];
    if (who === 'contractor') continue;
    const items = permitted.filter((c) => c.det.forms.some((f) => def.forms.includes(f))).map((c) => c.item);
    const ownerItems = who === 'owner' ? items : items.filter((i) => who.owner.includes(i.id));
    if (!ownerItems.length) continue;
    const subItems = items.filter((i) => !ownerItems.includes(i));
    const sub = facts.team[TEAM_KEY[trade]]?.name ?? `a ${def.person}`;
    const values = { trade: def.name, trade_person: def.person, sub };

    let failed: Flag | null = null;
    for (const r of h.rules.filter((x) => !x.trades || x.trades.includes(trade))) {
      if (!r.show_assumptions_when || matchProperty(r.show_assumptions_when, property)) {
        r.assumptions.forEach((a) => assumptions.add(a));
        r.office_questions.forEach((q) => officeQuestions.add(q));
      }
      if (failed) continue;
      let message: string | null = null;
      if (r.check === 'home') {
        const unknowns = blockingUnknowns(r.allowed!, trade, property, h.switches);
        if (unknowns === null) continue; // an allowed condition matched
        message = fill(r.cases.find((c) => matchProperty(c.when, property))?.message ?? r.message, values);
        message = [message, ...unknowns.map((f) => h.unknown_notes[f]).filter(Boolean)].join(' ');
      } else if (r.check === 'no_items') {
        const bad = ownerItems.find((i) => matchWhen(r.items!, i, property).ok);
        if (!bad) continue;
        message = fill(r.message, { ...values, item: r.item_names?.[String(bad.equipment)] ?? bad.label });
      } else if (subItems.length) {
        message = fill(r.message, values);
      } else continue;
      failed = { id: r.id, message, blocks_printing: true };
    }
    if (failed) flags.push(failed);
    else def.office_questions.forEach((q) => officeQuestions.add(q));
    trades.push({ trade, allowed: !failed, rule_id: failed?.id ?? null });
  }

  if (trades.length) {
    for (const e of h.entries) {
      if (e.id === 'HO-F4' && !trades.some((t) => t.allowed && t.trade === 'mechanical')) continue;
      e.assumptions.forEach((a) => assumptions.add(a));
      e.office_questions.forEach((q) => officeQuestions.add(q));
    }
    h.checklist.forEach((c) => c.assumptions.forEach((a) => assumptions.add(a)));
  }
  return { trades, flags, assumptions, officeQuestions };
}

/**
 * null if any allowed condition matches. Otherwise the unknown property facts that
 * alone kept a condition from matching (so the note can say the answer wasn't known).
 */
function blockingUnknowns(allowed: Cond[], trade: OwnerTrade, property: Record<string, unknown>, switches: Record<string, boolean>): string[] | null {
  const unknowns = new Set<string>();
  for (const cond of allowed) {
    const { trade: forTrade, switch: sw, ...facts } = cond;
    if (forTrade !== undefined && !(Array.isArray(forTrade) ? forTrade : [forTrade]).includes(trade)) continue;
    if (sw !== undefined && switches[String(sw)] !== true) continue;
    const missed = Object.keys(facts).filter((k) => !matchProperty({ [k]: facts[k] }, property));
    if (!missed.length) return null;
    if (missed.every((k) => property[k] === UNKNOWN)) missed.forEach((k) => unknowns.add(k));
  }
  return [...unknowns];
}

/** HO-T1 and HO-T2 for each trade the owner may do, and that trade's own note (Q-13 for HVACR). */
function ownerNotes(trades: OwnerTradeResult[], entries: Record<string, FormEntries>, rules: RuleSet): Note[] {
  const h = rules.homeowner;
  const tradeForms = rules.policies['CQ-04'].trade_forms as Record<Trade, string>;
  const notes: Note[] = [];
  for (const t of trades.filter((x) => x.allowed)) {
    const def = h.trades[t.trade];
    const cost = entries[tradeForms[t.trade]]?.est_cost;
    const amount = typeof cost === 'number' ? `$${cost.toLocaleString('en-US')}` : 'not given yet';
    for (const c of h.checklist) notes.push({ id: c.id, text: fill(c.text, { trade: def.name, amount }) });
    if (def.checklist_note) notes.push({ id: 'HO-F1', text: def.checklist_note });
  }
  return notes;
}

// ---------------------------------------------------------------------------
// Form entries (rules table §4.4)

function formEntries(
  facts: JobFacts,
  classified: Classified[],
  permitted: Classified[],
  forms: FormDetermination[],
  formDefs: FormDef[],
  rules: RuleSet,
  tier: Tier,
  ownerTrades: OwnerTradeResult[],
) {
  const property = facts.property as Record<string, unknown>;
  const h = rules.homeowner;
  const byOwner = new Set<Trade>(ownerTrades.map((t) => t.trade)); // all or some of the trade
  const p = rules.policies;
  const useGroup = p['CQ-06'].use_group as string;
  const tradeForms = p['CQ-04'].trade_forms as Record<Trade, string>;
  const formIds = new Set(forms.map((f) => f.form));
  const presentTrades = TRADES.filter((t) => formIds.has(tradeForms[t]));
  const assumptions = new Set<string>([...p['CQ-01'].assumptions, ...p['CQ-03'].assumptions, ...p['CQ-06'].assumptions]);
  const officeQuestions = new Set<string>();

  // Cost by trade (CQ-02 to CQ-04). One trade takes the remainder of the total. The owner's own
  // work isn't part of the contract total, so an owner-performed trade never does (HO-F5).
  const given = facts.costs as Record<Trade | 'total', number | null>;
  const remainderTrade = (p['CQ-03'].remainder_order as Trade[]).find((t) => presentTrades.includes(t) && !byOwner.has(t)) ?? null;
  const cost: Partial<Record<Trade, number | null>> = {};
  for (const t of presentTrades) cost[t] = given[t];
  const othersKnown = presentTrades.every((t) => t === remainderTrade || given[t] !== null);
  if (remainderTrade && given[remainderTrade] === null && given.total !== null && othersKnown) {
    const others = TRADES.filter((t) => t !== remainderTrade && !byOwner.has(t)).reduce((sum, t) => sum + (given[t] ?? 0), 0);
    cost[remainderTrade] = given.total - others >= 0 ? given.total - others : null;
  }
  const sum = (values: (number | null | undefined)[]) => (values.every((v) => typeof v === 'number') ? (values as number[]).reduce((a, b) => a + b, 0) : null);

  const entries: Record<string, FormEntries> = {};
  const fillIns: FillIn[] = [];
  const signer = (form: string) => forms.find((f) => f.form === form)?.signer ?? null;

  for (const def of formDefs) {
    const e: FormEntries = { use_group: useGroup };
    const missing: string[] = [];
    if (def.id === 'F100') {
      e.proposed_work =
        tier === 'MW' ? 'Minor Work' : permitted.some((c) => c.then?.alteration) ? 'Alteration' : 'Renovation';
      e.cost_by_subcode = {};
      for (const [row, trades] of Object.entries(p['CQ-02'].f100_rows as Record<string, Trade[]>)) {
        const here = trades.filter((t) => presentTrades.includes(t));
        if (here.length) e.cost_by_subcode[row] = sum(here.map((t) => cost[t]));
      }
      e.total_cost = sum(Object.values(e.cost_by_subcode));
      if (forms.find((f) => f.form === 'F100')?.by_owner) {
        // HO-F1: C, the trade boxes for what the owner may do, and D (contractors are on the job).
        const boxes = ownerTrades.filter((t) => t.allowed).map((t) => h.trades[t.trade].f100_box);
        e.owner_section = ['C', ...boxes.filter((b): b is string => Boolean(b)), 'D'];
      }
      if (presentTrades.includes('mechanical')) {
        p['CQ-02'].assumptions.forEach((a) => assumptions.add(a));
        p['CQ-02'].office_questions.forEach((q) => officeQuestions.add(q));
      }
    } else if (def.id === tradeForms.building) {
      const order = p['CQ-05'].order as string[];
      const types = new Set<string>(permitted.filter((c) => c.det.forms.includes(def.id)).map((c) => c.then?.f110_work ?? 'Rehabilitation'));
      e.type_of_work = order.filter((t) => types.has(t));
      e.rehabilitation_cost = cost.building ?? null;
      e.total_cost = cost.building ?? null;
    } else {
      const trade = TRADES.find((t) => tradeForms[t] === def.id);
      if (trade) e.est_cost = cost[trade] ?? null;
      const mine = ownerTrades.find((t) => t.allowed && t.trade === trade);
      if (mine) e.exempt_applicant = { license: h.trades[mine.trade].exempt_license, hic: h.exempt_hic, hic_short: h.exempt_hic_short }; // HO-F3
      if (def.id === tradeForms.mechanical) {
        e.heating_system = heatingSystem(classified, property, rules);
        if (e.heating_system && e.heating_system.fuel === null) missing.push('Heating system fuel');
      }
      const lines = formLines(def.id, classified, property, rules, assumptions);
      if (lines.lines.length) {
        e.lines = lines.lines;
        p['CQ-07'].assumptions.forEach((a) => assumptions.add(a));
      }
      missing.unshift(...lines.missingCounts, ...lines.missingSizes);
    }
    entries[def.id] = e;
    if (missing.length) fillIns.push({ form: def.id, signer: signer(def.id), details: missing });
  }
  return { entries, fillIns, presentTrades, remainderTrade, assumptions, officeQuestions };
}

function formLines(form: string, classified: Classified[], property: Record<string, unknown>, rules: RuleSet, assumptions: Set<string>) {
  const lines: (FormLine & { sizes?: (string | undefined)[] })[] = [];
  const byName = new Map<string, (typeof lines)[number]>();

  for (const def of rules.lines.filter((l) => l.form === form)) {
    for (const c of classified) {
      if (!matchWhen(def.when, c.item, property).ok) continue;
      if (def.when_rules.length && !def.when_rules.includes(c.det.rule_id!)) continue;
      if (def.item_adds_form && !c.det.forms.includes(form)) continue;

      let count: number | null;
      if (typeof def.count === 'number') count = def.count;
      else if ('fact' in def.count) count = typeof c.item[def.count.fact] === 'number' ? (c.item[def.count.fact] as number) : null;
      else {
        const fx = (c.item.fixtures ?? {}) as Record<string, number>;
        count = def.count.fixtures.reduce((n, t) => n + (fx[t] ?? 0), 0);
      }
      if (count === 0) continue;
      def.assumptions.forEach((a) => assumptions.add(a));

      if (def.label === 'item') {
        lines.push({ line: def.line, label: c.item.label, count });
        continue;
      }
      let line = byName.get(def.line);
      if (!line) {
        line = { line: def.line, count: 0, ...(def.marker ? { marker: def.marker } : {}), ...(def.sized ? { sizes: [] } : {}) };
        byName.set(def.line, line);
        lines.push(line);
      }
      line.count = line.count === null || count === null ? null : line.count + count;
      line.sizes?.push(c.item.kw as string | undefined);
    }
  }

  const missingSizes: string[] = [];
  const missingCounts: string[] = [];
  const out = lines.map(({ sizes, ...line }) => {
    if (line.count === null) missingCounts.push(`${line.line} count`); // "don't know" on a count (CQ-07)
    if (!sizes) return line;
    const known = sizes.every(Boolean);
    if (!known) missingSizes.push(`${line.line} size`);
    return { ...line, size: known ? sizes.join(' + ') : null };
  });
  return { lines: out, missingSizes, missingCounts };
}

function heatingSystem(classified: Classified[], property: Record<string, unknown>, rules: RuleSet): HeatingSystem | null {
  for (const h of rules.heating) {
    const c = classified.find((x) => matchWhen(h.when, x.item, property).ok);
    if (c) {
      const fuel = c.item.fuel as string | undefined;
      return { work: h.work, distribution: h.distribution, fuel: fuel && fuel !== UNKNOWN ? (FUEL_LABEL[fuel] ?? null) : null };
    }
  }
  return null;
}

function sortIds(ids: string[]): string[] {
  return ids.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}
