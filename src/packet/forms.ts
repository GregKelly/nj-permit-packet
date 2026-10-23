// The official DCA forms (assets/forms/) and their field maps: which of our
// names goes in which PDF field. Read from disk once and checked on load.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';

export const FORMS_DIR = new URL('../../assets/forms/', import.meta.url).pathname;

const Catalog = z
  .object({
    type: z.literal('forms'),
    downloaded: z.string(),
    forms: z.array(
      z
        .object({
          id: z.string().regex(/^F\d+$/),
          name: z.string(),
          file: z.string(),
          source: z.string().url(),
          revision: z.string(),
          pages: z.number().int().positive(),
          sha256: z.string().regex(/^[0-9a-f]{64}$/),
        })
        .strict(),
    ),
  })
  .strict();

/** A choice box: just the box to check, or a box plus a field that goes with it. */
const ChoiceTarget = z.union([
  z.string(),
  z.object({ check: z.string(), cost: z.string().optional(), text: z.string().optional() }).strict(),
]);

const LineTarget = z
  .object({
    qty: z.string(),
    size: z.string().optional(),
    /** Sub-boxes on the row to check for this line (e.g. KW [x] Dishwasher). */
    check: z.array(z.string()).default([]),
    /** The engine's marker (e.g. Smoke) → its box. */
    markers: z.record(z.string()).default({}),
    /** Field for an "Other" line's label. Without one, the label goes in the description. */
    label: z.string().optional(),
    /** A label this form needs for the line, e.g. a boiler written on Other. */
    fixed_label: z.string().optional(),
  })
  .strict();

const FieldMapSchema = z
  .object({
    type: z.literal('field_map'),
    form: z.string(),
    fields: z.record(z.string()),
    choices: z.record(z.record(ChoiceTarget)).default({}),
    lines: z.record(LineTarget).default({}),
  })
  .strict();

export type ChoiceTarget = z.infer<typeof ChoiceTarget>;
export type LineTarget = z.infer<typeof LineTarget>;
export type FieldMap = z.infer<typeof FieldMapSchema>;
export type FormInfo = z.infer<typeof Catalog>['forms'][number];

export interface OfficialForm extends FormInfo {
  map: FieldMap;
  /** The PDF exactly as DCA publishes it. */
  bytes: Uint8Array;
}

let cache: Map<string, OfficialForm> | null = null;

/** Every official form, keyed by ID. Throws if a map names an unknown field of ours. */
export function officialForms(dir = FORMS_DIR): Map<string, OfficialForm> {
  if (cache && dir === FORMS_DIR) return cache;
  const catalog = Catalog.parse(parse(readFileSync(dir + 'forms.yaml', 'utf8')));
  const out = new Map<string, OfficialForm>();
  for (const info of catalog.forms) {
    const map = FieldMapSchema.parse(parse(readFileSync(`${dir}${info.id}.map.yaml`, 'utf8')));
    if (map.form !== info.id) throw new Error(`${info.id}.map.yaml says it maps ${map.form}`);
    checkMapNames(map);
    out.set(info.id, { ...info, map, bytes: new Uint8Array(readFileSync(dir + info.file)) });
  }
  if (dir === FORMS_DIR) cache = out;
  return out;
}

export function officialForm(id: string): OfficialForm {
  const form = officialForms().get(id);
  if (!form) throw new Error(`No official PDF for ${id} in assets/forms/`);
  return form;
}

export function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** Choices and lines may only point at names listed under `fields`. */
function checkMapNames(map: FieldMap) {
  const errors: string[] = [];
  const known = (name: string | undefined, where: string) => {
    if (name !== undefined && !(name in map.fields)) errors.push(`${map.form} ${where}: "${name}" isn't under fields`);
  };
  for (const [group, values] of Object.entries(map.choices)) {
    for (const [value, t] of Object.entries(values)) {
      const where = `choices.${group}.${value}`;
      if (typeof t === 'string') known(t, where);
      else [t.check, t.cost, t.text].forEach((n) => known(n, where));
    }
  }
  for (const [line, t] of Object.entries(map.lines)) {
    [t.qty, t.size, t.label, ...t.check, ...Object.values(t.markers)].forEach((n) => known(n, `lines.${line}`));
  }
  if (errors.length) throw new Error(errors.join('\n'));
}
