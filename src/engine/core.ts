// The engine's decision steps, in the order of rules table §1. Facts in,
// determinations out; no I/O, no clock ("today" is passed in).

import { TRADES, UNKNOWN, type JobFacts, type Trade, type WorkItem } from './facts';
import type { FormDef, ItemRule, LicensingRule, RuleSet, ThenPart } from './load';
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
  PlansDetermination,
  Tier,
  ZoningDetermination,
} from './types';

const TIER_RANK: Record<Tier, number> = { OM: 0, MW: 1, FULL: 2 };
const TRADE_PERSON: Record<string, string> = { electrical: 'electrician', plumbing: 'plumber', hvacr: 'HVACR contractor' };
const TRADE_LICENSE: Record<string, string> = { electrical: 'electrical', plumbing: 'plumbing', hvacr: 'HVACR' };
const FUEL_LABEL: Record<string, string> = { gas: 'Gas', oil: 'Oil', propane: 'Propane', electric: 'Electric' };

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
    flags: [],
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
  if (facts.performed_by === 'owner') {
    const lc = licensingRule(rules, 'owner_trade_work');
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

  // 5–6. Forms and signers.
  const formIds = new Set<string>();
  if (tier !== 'OM') {
    formIds.add('F100');
    for (const c of permitted) c.det.forms.forEach((f) => formIds.add(f));
  }
  const formDefs = rules.forms.filter((f) => formIds.has(f.id));
  d.forms = formDefs.map((f) => ({ form: f.id, name: f.name, signer_role: f.signer, signer: signerFor(f, facts) }));

  // 7. Zoning prior approval.
  d.zoning = zoning(classified, property, rules, tier);

  // 8. Plans.
  d.plans = plans(classified, rules);

  // Reviewer tips (non-blocking).
  d.tips = tips(classified, property, rules);

  // 9. Work type, cost and quantities.
  const entries = tier === 'OM' ? null : formEntries(facts, classified, permitted, d.forms, formDefs, rules, tier);
  if (entries) {
    d.form_entries = entries.entries;
    d.fill_ins = entries.fillIns;
  }

  // 10. License and registration checks.
  if (tier !== 'OM') d.flags = licensingFlags(facts, d.forms, rules, today);

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
  entries?.officeQuestions.forEach((q) => questionIds.add(q));

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
// Form entries (rules table §4.4)

function formEntries(
  facts: JobFacts,
  classified: Classified[],
  permitted: Classified[],
  forms: FormDetermination[],
  formDefs: FormDef[],
  rules: RuleSet,
  tier: Tier,
) {
  const property = facts.property as Record<string, unknown>;
  const p = rules.policies;
  const useGroup = p['CQ-06'].use_group as string;
  const tradeForms = p['CQ-04'].trade_forms as Record<Trade, string>;
  const formIds = new Set(forms.map((f) => f.form));
  const presentTrades = TRADES.filter((t) => formIds.has(tradeForms[t]));
  const assumptions = new Set<string>([...p['CQ-01'].assumptions, ...p['CQ-03'].assumptions, ...p['CQ-06'].assumptions]);
  const officeQuestions = new Set<string>();

  // Cost by trade (CQ-02 to CQ-04). One trade takes the remainder of the total.
  const given = facts.costs as Record<Trade | 'total', number | null>;
  const remainderTrade = (p['CQ-03'].remainder_order as Trade[]).find((t) => presentTrades.includes(t)) ?? null;
  const cost: Partial<Record<Trade, number | null>> = {};
  for (const t of presentTrades) cost[t] = given[t];
  const othersKnown = presentTrades.every((t) => t === remainderTrade || given[t] !== null);
  if (remainderTrade && given[remainderTrade] === null && given.total !== null && othersKnown) {
    const others = TRADES.filter((t) => t !== remainderTrade).reduce((sum, t) => sum + (given[t] ?? 0), 0);
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
      if (def.id === tradeForms.mechanical) {
        e.heating_system = heatingSystem(classified, property, rules);
        if (e.heating_system && e.heating_system.fuel === null) missing.push('Heating system fuel');
      }
      const lines = formLines(def.id, classified, property, rules, assumptions);
      if (lines.lines.length) {
        e.lines = lines.lines;
        p['CQ-07'].assumptions.forEach((a) => assumptions.add(a));
      }
      missing.unshift(...lines.missingSizes);
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
  const out = lines.map(({ sizes, ...line }) => {
    if (!sizes) return line;
    const known = sizes.every(Boolean);
    if (!known) missingSizes.push(`${line.line} size`);
    return { ...line, size: known ? sizes.join(' + ') : null };
  });
  return { lines: out, missingSizes };
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
