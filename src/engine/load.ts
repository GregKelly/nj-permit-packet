// Rule checker and compiler. Takes the text of every rule file, validates it,
// and returns a RuleSet the engine can run. Pure: the caller reads the files
// (src/rules-dir.ts), so the engine never touches the disk.
//
// The checker rejects: invalid file shapes, duplicate IDs, references to
// assumptions / questions / forms / rules that don't exist, conditions on facts a
// work item kind doesn't have, condition values a fact can't take, and rule files
// missing from the manifest.

import { createHash } from 'node:crypto';
import { parse } from 'yaml';
import { z } from 'zod';
import { PROPERTY_FACTS, UNKNOWN, WORK_ITEM_KINDS, type FactSpec } from './facts';

export interface RuleSource {
  /** Path relative to the rules directory, with forward slashes. */
  path: string;
  text: string;
}

// ---------------------------------------------------------------------------
// Condition language (design doc §4.2): equals, one-of, numeric comparisons.

const Compare = z
  .object({ lt: z.number(), lte: z.number(), gt: z.number(), gte: z.number() })
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length === 1, 'use exactly one of lt / lte / gt / gte');
const Scalar = z.union([z.string(), z.number(), z.boolean()]);
const CondValue = z.union([Compare, Scalar, z.array(z.union([Compare, Scalar])).min(1)]);
const Cond = z.record(CondValue);
const When = z.union([Cond, z.array(Cond).min(1)]);

export type Comparison = { lt?: number; lte?: number; gt?: number; gte?: number };
export type CondValue = z.infer<typeof CondValue>;
export type Cond = Record<string, CondValue>;
export type When = Cond | Cond[];

// ---------------------------------------------------------------------------
// File shapes

const Id = z.string().regex(/^[A-Z]+-\d+$/, 'IDs look like KB-01');
const FormId = z.string().regex(/^F\d+$/, 'form IDs look like F110');
const Ids = z.array(z.string()).default([]);
const TIERS = ['OM', 'MW', 'FULL'] as const;

const Then = z
  .object({
    tier: z.enum(TIERS),
    forms: z.array(z.string()).default([]),
    f110_work: z.enum(['Rehabilitation', 'Roofing', 'Siding']).optional(),
    alteration: z.boolean().default(false),
    stop: z.string().optional(),
  })
  .strict();

const Case = z
  .object({ when: When.optional(), then: Then, reason: z.string().optional(), citation: z.string().optional(), assumptions: Ids })
  .strict();

const ItemRuleSchema = z
  .object({
    id: Id,
    title: z.string(),
    when: When,
    then: Then.optional(),
    cases: z.array(Case).min(1).optional(),
    reason: z.string(),
    citation: z.string().optional(),
    assumptions: Ids,
    office_questions: Ids,
    notes: z.string().optional(),
  })
  .strict()
  .refine((r) => Boolean(r.then) !== Boolean(r.cases), 'give exactly one of `then` or `cases`');

const RefSchema = z
  .object({ id: Id, title: z.string(), refers_to: z.array(z.string()).min(1), notes: z.string().optional() })
  .strict();

const LicensingRuleSchema = z
  .object({
    id: Id,
    title: z.string(),
    check: z.enum(['hic_missing', 'sub_missing', 'license_expired', 'owner_trade_work']),
    message: z.string(),
    blocks_printing: z.boolean(),
  })
  .strict();

/** A rule list entry is a reference when it has `refers_to`, otherwise the given schema. */
const entryOrRef = <T extends z.ZodTypeAny>(schema: T) =>
  z.any().transform((v, ctx): z.infer<T> | z.infer<typeof RefSchema> => {
    const result = (v && typeof v === 'object' && 'refers_to' in v ? RefSchema : schema).safeParse(v);
    if (result.success) return result.data;
    for (const issue of result.error.issues) ctx.addIssue({ ...issue, message: `${v?.id ?? ''} ${issue.path.join('.')}: ${issue.message}` });
    return z.NEVER;
  });

const FILE_SCHEMAS = {
  manifest: z.object({ type: z.literal('manifest'), state: z.string(), municipality: z.string(), files: z.array(z.string()) }).strict(),
  config: z
    .object({ type: z.literal('config'), municipality: z.string(), zoning_office: z.string(), flags: z.record(z.boolean()) })
    .strict(),
  scope: z
    .object({
      type: z.literal('scope'),
      title: z.string(),
      rules: z.array(z.object({ id: Id, title: z.string(), property: Cond, message: z.string(), source: z.string().optional() }).strict()),
    })
    .strict(),
  item_rules: z
    .object({ type: z.literal('item_rules'), group: z.string(), title: z.string(), rules: z.array(entryOrRef(ItemRuleSchema)) })
    .strict(),
  forms: z
    .object({
      type: z.literal('forms'),
      forms: z.array(
        z
          .object({
            id: FormId,
            name: z.string(),
            signer: z.enum(['owner_or_agent', 'applicant', 'electrical', 'plumbing', 'hvacr', 'none']),
            included: z.string(),
            assumptions: Ids,
            office_questions: Ids,
            notes: z.string().optional(),
          })
          .strict(),
      ),
    })
    .strict(),
  plans: z
    .object({
      type: z.literal('plans'),
      rules: z.array(
        z
          .object({
            id: Id,
            title: z.string(),
            when_rules: Ids,
            otherwise: z.boolean().default(false),
            requirement: z.enum(['sealed', 'floor_plan', 'none']),
            message: z.string(),
            assumptions: Ids,
            office_questions: Ids,
          })
          .strict(),
      ),
    })
    .strict(),
  form_entries: z
    .object({
      type: z.literal('form_entries'),
      policies: z.array(
        z.object({ id: Id, title: z.string(), rule: z.string(), assumptions: Ids, office_questions: Ids }).passthrough(),
      ),
      lines: z.array(
        z
          .object({
            form: FormId,
            line: z.string(),
            when: When,
            when_rules: Ids,
            count: z.union([z.number().int().positive(), z.object({ fact: z.string() }).strict(), z.object({ fixtures: z.array(z.string()).min(1) }).strict()]),
            sized: z.boolean().default(false),
            label: z.literal('item').optional(),
            marker: z.string().optional(),
            item_adds_form: z.boolean().default(false),
            assumptions: Ids,
          })
          .strict(),
      ),
      heating_system: z.array(z.object({ when: When, work: z.string(), distribution: z.string() }).strict()),
    })
    .strict(),
  licensing: z.object({ type: z.literal('licensing'), rules: z.array(entryOrRef(LicensingRuleSchema)) }).strict(),
  tips: z
    .object({
      type: z.literal('tips'),
      rules: z.array(
        z
          .object({ id: Id, title: z.string(), text: z.string(), when_item: When.optional(), when_property: Cond.optional() })
          .strict()
          .refine((t) => Boolean(t.when_item) !== Boolean(t.when_property), 'give exactly one of `when_item` or `when_property`'),
      ),
    })
    .strict(),
  submission: z
    .object({
      type: z.literal('submission'),
      rules: z.array(
        z
          .object({
            id: Id,
            title: z.string(),
            text: z.string(),
            /** Only when the plans requirement is one of these; otherwise always. */
            when_plans: z.array(z.enum(['sealed', 'floor_plan', 'none'])).optional(),
            citation: z.string().optional(),
            assumptions: Ids,
          })
          .strict(),
      ),
    })
    .strict(),
  assumptions: z
    .object({
      type: z.literal('assumptions'),
      entries: z.array(z.object({ id: Id, text: z.string(), confirm_with: z.string(), config_flag: z.string().optional() }).strict()),
    })
    .strict(),
  office_questions: z
    .object({
      type: z.literal('office_questions'),
      entries: z.array(z.object({ id: Id, text: z.string(), status: z.enum(['open', 'resolved']).default('open') }).strict()),
    })
    .strict(),
  zoning: z
    .object({
      type: z.literal('zoning'),
      rules: z.array(
        z
          .object({
            id: Id,
            title: z.string(),
            role: z.enum(['interior', 'exterior_change', 'exterior_like_for_like', 'zoning_only', 'unknown_trigger']),
            status: z.enum(['required', 'not_required', 'probably_not_required']).optional(),
            config_flag: z.string().optional(),
            triggers: When.optional(),
            message: z.string(),
            checklist: z.array(z.string()).default([]),
            assumptions: Ids,
            citation: z.string().optional(),
            notes: z.string().optional(),
          })
          .strict(),
      ),
    })
    .strict(),
};

type Files = { [K in keyof typeof FILE_SCHEMAS]: z.infer<(typeof FILE_SCHEMAS)[K]> };

export type ItemRule = z.infer<typeof ItemRuleSchema> & { group: string };
export type RefRule = z.infer<typeof RefSchema> & { group: string };
export type Tier = (typeof TIERS)[number];
export type ThenPart = z.infer<typeof Then>;
export type ScopeRule = Files['scope']['rules'][number];
export type FormDef = Files['forms']['forms'][number];
export type PlanRule = Files['plans']['rules'][number];
export type LineDef = Files['form_entries']['lines'][number];
export type HeatingDef = Files['form_entries']['heating_system'][number];
export type LicensingRule = z.infer<typeof LicensingRuleSchema>;
export type TipRule = Files['tips']['rules'][number];
export type SubmissionRule = Files['submission']['rules'][number];
export type ZoningRule = Files['zoning']['rules'][number];
export type Assumption = Files['assumptions']['entries'][number];
export type OfficeQuestion = Files['office_questions']['entries'][number];

export interface RuleGroup {
  group: string;
  title: string;
  file: string;
  entries: (ItemRule | RefRule)[];
}

export interface RuleSet {
  /** Hash of every rule file; stored with each job so a packet traces to its rules. */
  version: string;
  /** Every ID defined anywhere in the rule data. */
  ids: Set<string>;
  config: Files['config'];
  scope: ScopeRule[];
  groups: RuleGroup[];
  /** Item rules in matching order (references left out). */
  itemRules: ItemRule[];
  forms: FormDef[];
  plans: PlanRule[];
  policies: Record<string, Record<string, unknown> & { id: string; title: string; rule: string; assumptions: string[]; office_questions: string[] }>;
  lines: LineDef[];
  heating: HeatingDef[];
  licensing: (LicensingRule | RefRule)[];
  tips: TipRule[];
  submission: SubmissionRule[];
  zoning: ZoningRule[];
  assumptions: Map<string, Assumption>;
  officeQuestions: Map<string, OfficeQuestion>;
  /** Numbers worth trying for a count fact, from the comparisons rules make (`kind.fact` or `property.fact`). */
  thresholds: Map<string, number[]>;
}

// ---------------------------------------------------------------------------

export function compileRules(sources: RuleSource[]): RuleSet {
  const errors: string[] = [];
  const parsed = new Map<string, { type: string; data: any }>();

  for (const source of sources) {
    let doc: any;
    try {
      doc = parse(source.text);
    } catch (e) {
      errors.push(`${source.path}: not valid YAML: ${(e as Error).message}`);
      continue;
    }
    const type = doc?.type as keyof typeof FILE_SCHEMAS;
    const schema = FILE_SCHEMAS[type];
    if (!schema) {
      errors.push(`${source.path}: unknown file type "${doc?.type}"`);
      continue;
    }
    const result = schema.safeParse(doc);
    if (!result.success) {
      for (const issue of result.error.issues) errors.push(`${source.path}: ${issue.path.join('.') || '(file)'}: ${issue.message}`);
      continue;
    }
    parsed.set(source.path, { type, data: result.data });
  }

  // Manifest: every file listed, every listed file present.
  const manifestEntry = parsed.get('manifest.yaml');
  if (!manifestEntry) fail([...errors, 'manifest.yaml is missing']);
  const manifest = manifestEntry!.data as Files['manifest'];
  for (const s of sources) if (s.path !== 'manifest.yaml' && !manifest.files.includes(s.path)) errors.push(`${s.path}: not listed in the manifest`);
  for (const f of manifest.files) if (!sources.some((s) => s.path === f)) errors.push(`manifest lists ${f}, which doesn't exist`);
  if (errors.length) fail(errors);

  const ordered = manifest.files.map((path) => ({ path, ...parsed.get(path)! }));
  const ofType = <K extends keyof Files>(type: K) =>
    ordered.filter((f) => f.type === type).map((f) => ({ path: f.path, data: f.data as Files[K] }));

  const configs = ofType('config');
  if (configs.length !== 1) fail([`expected exactly one config file, found ${configs.length}`]);
  const config = configs[0].data;

  const rs: RuleSet = {
    version: createHash('sha256')
      .update([...sources].sort((a, b) => a.path.localeCompare(b.path)).map((s) => `${s.path}\0${s.text}`).join('\0'))
      .digest('hex')
      .slice(0, 12),
    ids: new Set(),
    config,
    scope: ofType('scope').flatMap((f) => f.data.rules),
    groups: ofType('item_rules').map((f) => ({
      group: f.data.group,
      title: f.data.title,
      file: f.path,
      entries: f.data.rules.map((r) => ({ ...r, group: f.data.group })),
    })),
    itemRules: [],
    forms: ofType('forms').flatMap((f) => f.data.forms),
    plans: ofType('plans').flatMap((f) => f.data.rules),
    policies: {},
    lines: ofType('form_entries').flatMap((f) => f.data.lines),
    heating: ofType('form_entries').flatMap((f) => f.data.heating_system),
    licensing: ofType('licensing').flatMap((f) => f.data.rules.map((r) => ('refers_to' in r ? { ...r, group: 'LC' } : r))),
    tips: ofType('tips').flatMap((f) => f.data.rules),
    submission: ofType('submission').flatMap((f) => f.data.rules),
    zoning: ofType('zoning').flatMap((f) => f.data.rules),
    assumptions: new Map(ofType('assumptions').flatMap((f) => f.data.entries.map((a) => [a.id, a] as const))),
    officeQuestions: new Map(ofType('office_questions').flatMap((f) => f.data.entries.map((q) => [q.id, q] as const))),
    thresholds: new Map(),
  };
  rs.itemRules = rs.groups.flatMap((g) => g.entries.filter((e): e is ItemRule => !('refers_to' in e)));
  for (const f of ofType('form_entries')) for (const p of f.data.policies) rs.policies[p.id] = p as RuleSet['policies'][string];

  // Unique IDs across all rule data.
  const allIds = [
    ...rs.scope.map((r) => r.id),
    ...rs.groups.flatMap((g) => g.entries.map((e) => e.id)),
    ...rs.forms.map((f) => f.id),
    ...rs.plans.map((r) => r.id),
    ...Object.values(ofType('form_entries').flatMap((f) => f.data.policies.map((p) => p.id))),
    ...rs.licensing.map((r) => r.id),
    ...rs.tips.map((r) => r.id),
    ...rs.submission.map((r) => r.id),
    ...rs.zoning.map((r) => r.id),
    ...ofType('assumptions').flatMap((f) => f.data.entries.map((a) => a.id)),
    ...ofType('office_questions').flatMap((f) => f.data.entries.map((q) => q.id)),
  ];
  for (const id of allIds) {
    if (rs.ids.has(id)) errors.push(`duplicate ID ${id}`);
    rs.ids.add(id);
  }

  // References.
  const ref = (where: string, kind: string, ids: string[], pool: { has(id: string): boolean }) => {
    for (const id of ids) if (!pool.has(id)) errors.push(`${where}: ${kind} ${id} doesn't exist`);
  };
  const formIds = new Set(rs.forms.map((f) => f.id));
  const itemRuleIds = new Set(rs.groups.flatMap((g) => g.entries.map((e) => e.id)));
  const flags = new Set(Object.keys(config.flags));

  for (const g of rs.groups) {
    for (const e of g.entries) {
      const where = `${g.file} ${e.id}`;
      if ('refers_to' in e) {
        ref(where, 'referenced rule', e.refers_to, rs.ids);
        continue;
      }
      ref(where, 'assumption', e.assumptions, rs.assumptions);
      ref(where, 'office question', e.office_questions, rs.officeQuestions);
      const kinds = checkWhen(e.when, null, where, errors, rs.thresholds);
      const thens = e.then ? [e.then] : e.cases!.map((c) => c.then);
      for (const t of thens) ref(where, 'form', t.forms, formIds);
      for (const c of e.cases ?? []) {
        ref(where, 'assumption', c.assumptions, rs.assumptions);
        if (c.when) checkWhen(c.when, kinds, `${where} (case)`, errors, rs.thresholds);
      }
    }
  }
  for (const r of rs.scope) checkPropertyCond(r.property, `scope ${r.id}`, errors, rs.thresholds, true);
  for (const f of rs.forms) {
    ref(`form ${f.id}`, 'assumption', f.assumptions, rs.assumptions);
    ref(`form ${f.id}`, 'office question', f.office_questions, rs.officeQuestions);
  }
  for (const p of rs.plans) {
    ref(`plans ${p.id}`, 'rule', p.when_rules, itemRuleIds);
    ref(`plans ${p.id}`, 'assumption', p.assumptions, rs.assumptions);
    ref(`plans ${p.id}`, 'office question', p.office_questions, rs.officeQuestions);
  }
  if (rs.plans.filter((p) => p.otherwise).length !== 1) errors.push('plans: exactly one rule needs `otherwise: true`');
  for (const p of Object.values(rs.policies)) {
    ref(`form entries ${p.id}`, 'assumption', p.assumptions, rs.assumptions);
    ref(`form entries ${p.id}`, 'office question', p.office_questions, rs.officeQuestions);
  }
  for (const l of rs.lines) {
    const where = `form entries line "${l.line}"`;
    ref(where, 'form', [l.form], formIds);
    ref(where, 'rule', l.when_rules, itemRuleIds);
    ref(where, 'assumption', l.assumptions, rs.assumptions);
    checkWhen(l.when, null, where, errors, null);
  }
  for (const h of rs.heating) checkWhen(h.when, null, `heating system "${h.work}"`, errors, null);
  for (const r of rs.licensing) if ('refers_to' in r) ref(`licensing ${r.id}`, 'referenced rule', r.refers_to, rs.ids);
  for (const t of rs.tips) {
    if (t.when_item) checkWhen(t.when_item, null, `tip ${t.id}`, errors, rs.thresholds);
    if (t.when_property) checkPropertyCond(t.when_property, `tip ${t.id}`, errors, rs.thresholds, true);
  }
  for (const s of rs.submission) ref(`submission ${s.id}`, 'assumption', s.assumptions, rs.assumptions);
  for (const z of rs.zoning) {
    ref(`zoning ${z.id}`, 'assumption', z.assumptions, rs.assumptions);
    if (z.config_flag && !flags.has(z.config_flag)) errors.push(`zoning ${z.id}: config flag ${z.config_flag} isn't in config.yaml`);
    if (z.triggers) checkWhen(z.triggers, null, `zoning ${z.id}`, errors, rs.thresholds);
  }
  for (const role of ['interior', 'exterior_change', 'exterior_like_for_like', 'unknown_trigger', 'zoning_only'] as const) {
    if (rs.zoning.filter((z) => z.role === role).length !== 1) errors.push(`zoning: expected exactly one rule with role ${role}`);
  }
  for (const a of rs.assumptions.values()) {
    if (a.config_flag && !flags.has(a.config_flag)) errors.push(`assumption ${a.id}: config flag ${a.config_flag} isn't in config.yaml`);
  }
  const need: [string, string][] = [['CQ-02', 'f100_rows'], ['CQ-03', 'remainder_order'], ['CQ-04', 'trade_forms'], ['CQ-05', 'order'], ['CQ-06', 'use_group']];
  for (const [id, key] of need) if (!rs.policies[id]?.[key]) errors.push(`form entries ${id}: needs \`${key}\``);

  if (errors.length) fail(errors);
  for (const [k, v] of rs.thresholds) rs.thresholds.set(k, [...new Set(v)].sort((a, b) => a - b));
  return rs;
}

function fail(errors: string[]): never {
  throw new Error(`Rule files have ${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
}

// ---------------------------------------------------------------------------
// Condition checks

/** Check a `when`; returns the work item kinds it covers (for checking its cases). */
function checkWhen(when: When, parentKinds: string[] | null, where: string, errors: string[], thresholds: Map<string, number[]> | null): string[] {
  const kindsSeen = new Set<string>();
  for (const cond of Array.isArray(when) ? when : [when]) {
    let kinds = parentKinds ?? [];
    if ('kind' in cond) {
      const listed = (Array.isArray(cond.kind) ? cond.kind : [cond.kind]).map(String);
      for (const k of listed) if (!WORK_ITEM_KINDS[k]) errors.push(`${where}: work item kind "${k}" doesn't exist`);
      kinds = listed.filter((k) => WORK_ITEM_KINDS[k]);
    } else if (!parentKinds) {
      errors.push(`${where}: condition needs a \`kind\``);
      continue;
    }
    kinds.forEach((k) => kindsSeen.add(k));
    for (const [key, value] of Object.entries(cond)) {
      if (key === 'kind') continue;
      if (key.startsWith('property.')) {
        checkPropertyCond({ [key.slice('property.'.length)]: value }, where, errors, thresholds, false);
        continue;
      }
      const specs = kinds.map((k) => [k, WORK_ITEM_KINDS[k][key]] as const).filter(([, s]) => s);
      if (!specs.length) {
        errors.push(`${where}: "${key}" isn't a fact of ${kinds.join(' / ') || 'any kind'}`);
        continue;
      }
      for (const [kind, spec] of specs) checkValue(spec, value, `${where}: ${key}`, errors, thresholds, `${kind}.${key}`);
    }
  }
  return [...kindsSeen];
}

function checkPropertyCond(cond: Cond, where: string, errors: string[], thresholds: Map<string, number[]> | null, plain: boolean) {
  for (const [key, value] of Object.entries(cond)) {
    const spec = PROPERTY_FACTS[key];
    if (!spec) {
      errors.push(`${where}: "${plain ? '' : 'property.'}${key}" isn't a property fact`);
      continue;
    }
    checkValue(spec, value, `${where}: property.${key}`, errors, thresholds, `property.${key}`);
  }
}

function checkValue(spec: FactSpec, value: CondValue, where: string, errors: string[], thresholds: Map<string, number[]> | null, thresholdKey: string) {
  for (const v of Array.isArray(value) ? value : [value]) {
    if (spec.type === 'text') continue; // free text (e.g. municipality): any value
    if (spec.type === 'fixtures') {
      errors.push(`${where}: fixture counts can't be used in conditions`);
      continue;
    }
    if (typeof v === 'object') {
      if (spec.type !== 'count') {
        errors.push(`${where}: comparisons only work on numbers`);
        continue;
      }
      const [op, n] = Object.entries(v)[0] as [keyof Comparison, number];
      const tries = op === 'lte' || op === 'gt' ? [n, n + 1] : [n - 1, n];
      if (thresholds) thresholds.set(thresholdKey, [...(thresholds.get(thresholdKey) ?? []), ...tries.filter((t) => t >= 0)]);
      continue;
    }
    if (spec.type === 'count') {
      if (v !== UNKNOWN && typeof v !== 'number') errors.push(`${where}: "${v}" isn't a number or unknown`);
      continue;
    }
    const allowed = spec.unknown ? [...spec.values, UNKNOWN] : spec.values;
    if (!allowed.includes(String(v))) errors.push(`${where}: "${v}" isn't one of ${allowed.join(', ')}`);
  }
}
