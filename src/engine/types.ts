// Engine output: the determinations. Design doc §4.3.

export type Tier = 'OM' | 'MW' | 'FULL';

export type Outcome =
  | 'out_of_scope' // stop: not a v1 job (scope, LC-05, KB-24)
  | 'cannot_classify' // an item matched no rule: call the office
  | 'no_permit' // every item is ordinary maintenance
  | 'zoning_only' // no construction permit, but a zoning permit applies (ZN-04)
  | 'minor_work'
  | 'permit';

export interface ItemDetermination {
  item_id: string;
  label: string;
  kind: string;
  rule_id: string | null;
  tier: Tier | null;
  reason: string;
  citation?: string;
  forms: string[];
  assumptions: string[];
  office_questions: string[];
  /** Facts that were unknown, so the conservative branch applied. */
  assumed_unknown: string[];
  error?: string;
}

export interface FormDetermination {
  form: string;
  name: string;
  signer_role: string;
  /** Who signs: a name from the profile or subcontractor directory; null if missing (LC-02). */
  signer: string | null;
}

export interface ZoningDetermination {
  rule_id: string;
  status: 'required' | 'not_required' | 'probably_not_required';
  message: string;
  checklist: string[];
  assumptions: string[];
  /** True when the trigger was matched only because a fact was unknown (ZN-05). */
  assumed_unknown: boolean;
}

export interface PlansDetermination {
  rule_id: string;
  requirement: 'sealed' | 'floor_plan' | 'none';
  message: string;
  because: string[];
  assumptions: string[];
}

export interface Note {
  id: string;
  text: string;
}

export interface Flag {
  id: string;
  message: string;
  blocks_printing: boolean;
}

export interface FormLine {
  line: string;
  count: number | null;
  label?: string;
  marker?: string;
  /** Present only on lines that have a size column; null = left for the sub to fill in. */
  size?: string | null;
}

export interface HeatingSystem {
  work: string;
  distribution: string;
  fuel: string | null;
}

export interface FormEntries {
  use_group: string;
  // F100
  proposed_work?: string;
  cost_by_subcode?: Record<string, number | null>;
  total_cost?: number | null;
  // F110
  type_of_work?: string[];
  rehabilitation_cost?: number | null;
  // F120 / F130 / F145
  est_cost?: number | null;
  heating_system?: HeatingSystem | null;
  lines?: FormLine[];
}

export interface FillIn {
  form: string;
  signer: string | null;
  details: string[];
}

export interface Question {
  /** `<item id>.<fact>`, `property.<fact>` or `costs.<trade>` */
  key: string;
  item_id?: string;
  fact: string;
  /** The values to choose from; empty for numbers and costs. */
  options: string[];
}

export interface Determinations {
  outcome: Outcome;
  job_tier: Tier | null;
  items: ItemDetermination[];
  forms: FormDetermination[];
  zoning: ZoningDetermination | null;
  plans: PlansDetermination | null;
  tips: Note[];
  flags: Flag[];
  form_entries: Record<string, FormEntries>;
  fill_ins: FillIn[];
  questions: Question[];
  assumptions_applied: { id: string; text: string; confirm_with: string }[];
  office_questions: Note[];
  print_blocked: boolean;
  rules_version: string;
  today: string;
}
