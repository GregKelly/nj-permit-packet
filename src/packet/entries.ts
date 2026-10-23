// What goes in each box: the engine's form entries, plus details from the
// profile, subcontractor directory and job, keyed by our field names
// (assets/forms/<form>.map.yaml). No decisions are made here: every entry is
// either the engine's or a copy of something the contractor entered.

import type { Determinations, FormEntries, FormLine } from '../engine';
import type { FieldValue, FormValues } from './fill';
import { officialForm, type ChoiceTarget, type LineTarget } from './forms';
import type { Address, PacketJob, PacketProfile, Party, Subcontractor } from './types';

export const SEE_SCOPE = 'See attached scope of work.';
const ON_OTHER = '(on the Other line)';

/** Form → our field name → value, for every form the engine selected. */
export function formValues(job: PacketJob, d: Determinations, profile: PacketProfile): Record<string, FormValues> {
  const out: Record<string, FormValues> = {};
  for (const f of d.forms) {
    const entries = d.form_entries[f.form] ?? { use_group: '' };
    const v: FormValues = {};
    if (f.form === 'F100') f100(v, job, entries, profile);
    else if (f.form === 'F370') f370(v, job, partyFor(f.signer_role, job, profile));
    else techSection(v, f.form, job, d, entries, f.signer_role, profile);
    out[f.form] = v;
  }
  return out;
}

// ---------------------------------------------------------------------------

function f100(v: FormValues, job: PacketJob, e: FormEntries, profile: PacketProfile) {
  const { choices } = officialForm('F100').map;
  const site = siteAddress(job);
  const me = profile.applicant;

  put(v, 'site.block', job.site.block);
  put(v, 'site.lot', job.site.lot);
  put(v, 'site.qualifier', job.site.qualifier);
  put(v, 'site.address', job.facts.property.address);
  put(v, 'site.work_site', oneLine(site));
  put(v, 'owner.name', job.owner.name);
  put(v, 'owner.phone', job.owner.phone);
  put(v, 'owner.email', job.owner.email);
  put(v, 'owner.street', job.owner.address?.street);
  put(v, 'owner.municipality', job.owner.address?.city);
  put(v, 'owner.zip', job.owner.address?.zip);
  v['ownership.private'] = 'X'; // v1 scope: one- and two-family homes

  // §I.4 Principal Contractor, and the Agent Section on page 2 (M2 plan decision 1).
  put(v, 'contractor.name', me.name);
  put(v, 'contractor.phone', me.phone);
  put(v, 'contractor.address', me.address?.street);
  put(v, 'contractor.address_2', me.address && cityLine(me.address));
  put(v, 'contractor.email', me.email);
  put(v, 'contractor.license', me.license);
  put(v, 'contractor.license_expires', me.license_expires && usDate(me.license_expires));
  put(v, 'contractor.hic', me.hic_registration ?? undefined);
  put(v, 'contractor.fein', me.fein?.replace(/\D/g, '')); // the box takes 9 digits
  v['agent.is_contractor'] = true;
  put(v, 'agent.name', me.name);
  put(v, 'agent.address', me.address?.street);
  put(v, 'agent.city_state_zip', me.address && cityLine(me.address));
  put(v, 'agent.phone', me.phone);

  // §IIa, §IIb, §VII: the engine's entries.
  if (e.proposed_work) check(v, choice(choices, 'proposed_work', e.proposed_work));
  for (const [row, cost] of Object.entries(e.cost_by_subcode ?? {})) {
    const t = choice(choices, 'subcode', row);
    check(v, t);
    if (typeof t !== 'string' && t.cost) put(v, t.cost, cost === null ? undefined : `$${money(cost)}`);
  }
  put(v, 'est_cost.total', e.total_cost == null ? undefined : `$${money(e.total_cost)}`);
  put(v, 'use_group.proposed', e.use_group);
}

function techSection(v: FormValues, form: string, job: PacketJob, d: Determinations, e: FormEntries, role: string, profile: PacketProfile) {
  const { map } = officialForm(form);
  siteAndOwner(v, job);
  const who = partyFor(role, job, profile);
  if (who) contractorBoxes(v, who);
  if (who && 'trade' in who) v.licensed_contractor = true; // A-2: the licensed trade signs its own section

  // Use group: two text boxes (F110, F120, F130) or R-3/R-5 boxes (F145).
  if (map.choices.use_group) check(v, choice(map.choices, 'use_group', e.use_group));
  else {
    put(v, 'use_group.present', e.use_group);
    put(v, 'use_group.proposed', e.use_group);
  }

  // F110 type of work and cost.
  for (const t of e.type_of_work ?? []) check(v, choice(map.choices, 'type_of_work', t));
  if ('rehabilitation_cost' in e) put(v, 'est_cost.rehabilitation', e.rehabilitation_cost == null ? undefined : money(e.rehabilitation_cost));
  if (map.choices.type_of_work) put(v, 'est_cost.total', e.total_cost == null ? undefined : money(e.total_cost));

  // F120 / F130 / F145 cost.
  if ('est_cost' in e) put(v, 'est_cost', e.est_cost == null ? undefined : money(e.est_cost));

  // F145 heating system boxes (CQ-09); fuel left blank when not known (CQ-08).
  if (e.heating_system) {
    check(v, choice(map.choices, 'heating_work', e.heating_system.work));
    check(v, choice(map.choices, 'heating_distribution', e.heating_system.distribution));
    const fuel = e.heating_system.fuel;
    if (fuel) {
      const t = map.choices.fuel?.[fuel] ?? choice(map.choices, 'fuel', 'other');
      check(v, t);
      if (typeof t !== 'string' && t.text) put(v, t.text, fuel);
    }
  }

  // Quantity lines (CQ-07). Labels with no box on the form go in the description.
  const unboxed = quantityLines(v, form, e.lines ?? [], map.lines);

  // Description of work: this section's work items (M2 plan, "What goes on the forms").
  const lines = d.items.filter((i) => i.forms.includes(form)).map((i) => (unboxed.delete(i.label) ? `${i.label} ${ON_OTHER}` : i.label));
  for (const label of unboxed) lines.push(`Other: ${label}`);
  const description: FieldValue = { text: [...lines, SEE_SCOPE].join('\n'), fallback: SEE_SCOPE };
  if ('description' in map.fields) v.description = description;
}

/** Fill the quantity rows; returns the "Other" labels that have no box of their own. */
function quantityLines(v: FormValues, form: string, lines: FormLine[], targets: Record<string, LineTarget>): Set<string> {
  const counts = new Map<string, number | null>();
  const sizes = new Map<string, string[]>();
  const labels = new Map<string, string[]>();
  const unboxed = new Set<string>();
  for (const line of lines) {
    const t = targets[line.line];
    if (!t) throw new Error(`${form} has no row for the quantity line "${line.line}" (add it to ${form}.map.yaml)`);
    const before = counts.has(t.qty) ? counts.get(t.qty)! : 0;
    counts.set(t.qty, before === null || line.count === null ? null : before + line.count);
    if (t.size && line.size) sizes.set(t.size, [...(sizes.get(t.size) ?? []), line.size]);
    t.check.forEach((box) => (v[box] = true));
    if (line.marker) {
      const box = t.markers[line.marker];
      if (!box) throw new Error(`${form} "${line.line}" has no box for the marker ${line.marker}`);
      v[box] = true;
    }
    const label = t.fixed_label ?? line.label;
    if (label) {
      if (t.label) labels.set(t.label, [...(labels.get(t.label) ?? []), label]);
      else unboxed.add(label);
    }
  }
  for (const [field, n] of counts) put(v, field, n === null ? undefined : String(n));
  for (const [field, s] of sizes) put(v, field, s.join(' + '));
  for (const [field, l] of labels) put(v, field, l.join('; '));
  return unboxed;
}

function f370(v: FormValues, job: PacketJob, who: Party | null) {
  put(v, 'site.block', job.site.block);
  put(v, 'site.lot', job.site.lot);
  put(v, 'site.qualifier', job.site.qualifier);
  put(v, 'site.address', oneLine(siteAddress(job)));
  put(v, 'owner.name', job.owner.name);
  if (!who) return;
  put(v, 'verifier.company', who.name);
  put(v, 'verifier.address', who.address && oneLine(who.address));
  const [area, number] = splitPhone(who.phone);
  put(v, 'verifier.phone_area', area);
  put(v, 'verifier.phone', number);
}

// ---------------------------------------------------------------------------
// Shared boxes

function siteAndOwner(v: FormValues, job: PacketJob) {
  put(v, 'site.block', job.site.block);
  put(v, 'site.lot', job.site.lot);
  put(v, 'site.qualifier', job.site.qualifier);
  put(v, 'site.address', oneLine(siteAddress(job)));
  put(v, 'owner.name', job.owner.name);
  const [area, number] = splitPhone(job.owner.phone);
  put(v, 'owner.phone_area', area);
  put(v, 'owner.phone', number);
  put(v, 'owner.email', job.owner.email);
  put(v, 'owner.address', job.owner.address && oneLine(job.owner.address));
}

function contractorBoxes(v: FormValues, who: Party & { license?: string; license_expires?: string; expires?: string; hic_registration?: string | null; fein?: string }) {
  put(v, 'contractor.name', who.name);
  const [area, number] = splitPhone(who.phone);
  put(v, 'contractor.phone_area', area);
  put(v, 'contractor.phone', number);
  put(v, 'contractor.address', who.address?.street);
  put(v, 'contractor.address_2', who.address && cityLine(who.address));
  put(v, 'contractor.email', who.email);
  put(v, 'contractor.license', who.license);
  const expires = who.expires ?? who.license_expires;
  put(v, 'contractor.license_expires', expires && usDate(expires));
  put(v, 'contractor.hic', who.hic_registration ?? undefined);
  put(v, 'contractor.fein', who.fein);
}

/** The applicant, or the sub the job's facts name for this trade (looked up in the directory by license). */
function partyFor(role: string, job: PacketJob, profile: PacketProfile) {
  if (role === 'applicant') return profile.applicant;
  const member = job.facts.team[role as Subcontractor['trade']];
  if (!member) return null; // LC-02: no sub for this trade; the boxes stay blank
  return profile.subcontractors.find((s) => s.license === member.license) ?? { ...member, trade: role as Subcontractor['trade'] };
}

// ---------------------------------------------------------------------------
// Formatting

function siteAddress(job: PacketJob): Address {
  return { street: job.facts.property.address, city: String(job.facts.property.municipality), state: 'NJ', zip: job.site.zip };
}

export const cityLine = (a: Address) => `${a.city}, ${a.state} ${a.zip}`;
export const oneLine = (a: Address) => `${a.street}, ${cityLine(a)}`;
export const money = (n: number) => n.toLocaleString('en-US');

/** 2027-06-30 → 06/30/2027 */
function usDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : iso;
}

/** 973-555-0101 → ["973", "555-0101"]; anything else stays whole. */
function splitPhone(phone?: string): [string | undefined, string | undefined] {
  const m = phone && /^\(?(\d{3})\)?[-. ]?(\d{3}-?\d{4})$/.exec(phone.trim());
  return m ? [m[1], m[2]] : [undefined, phone];
}

function put(v: FormValues, name: string, value: string | undefined | null) {
  if (value !== undefined && value !== null && value !== '') v[name] = value;
}

function check(v: FormValues, target: ChoiceTarget) {
  v[typeof target === 'string' ? target : target.check] = true;
}

function choice(choices: Record<string, Record<string, ChoiceTarget>>, group: string, value: string): ChoiceTarget {
  const t = choices[group]?.[value];
  if (!t) throw new Error(`No box for ${group} "${value}" in the field map`);
  return t;
}
