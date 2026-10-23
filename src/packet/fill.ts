// Fills an official form from our names (via its field map) with pdf-lib, then
// flattens it: the entries become printed text, so they print reliably and
// can't be edited by accident.

import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFFont,
  PDFName,
  PDFNumber,
  PDFTextField,
  StandardFonts,
  type PDFDict,
  type PDFField,
} from 'pdf-lib';
import { officialForm } from './forms';

/**
 * A text entry, a checkbox (true = checked), or text that falls back to a
 * shorter entry when it can't fit the box at a readable size.
 */
export type FieldValue = string | boolean | { text: string; fallback: string };
/** Our field name → value. */
export type FormValues = Record<string, FieldValue>;

const MIN_FONT = 6;
const DEFAULT_FONT = 10;

export async function fillForm(formId: string, values: FormValues, { flatten = true } = {}): Promise<PDFDocument> {
  const { map } = officialForm(formId);
  const byPdfName: Record<string, FieldValue> = {};
  for (const [name, value] of Object.entries(values)) {
    const pdfName = map.fields[name];
    if (!pdfName) throw new Error(`${formId}: "${name}" isn't in ${formId}.map.yaml`);
    byPdfName[pdfName] = value;
  }
  return fillByPdfName(formId, byPdfName, { flatten });
}

/** Fill fields by the PDF's own names (the proof sheet uses this directly). */
export async function fillByPdfName(
  formId: string,
  values: Record<string, FieldValue>,
  { flatten = true, minFont = MIN_FONT } = {},
): Promise<PDFDocument> {
  const doc = await PDFDocument.load(officialForm(formId).bytes, { updateMetadata: false });
  const form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const [pdfName, value] of Object.entries(values)) setField(formId, form.getField(pdfName), value, font, minFont);
  form.updateFieldAppearances(font);
  if (flatten) form.flatten({ updateFieldAppearances: false });
  return doc;
}

function setField(formId: string, field: PDFField, value: FieldValue, font: PDFFont, minFont: number) {
  const where = `${formId} field "${field.getName()}"`;
  if (field instanceof PDFCheckBox) {
    if (typeof value !== 'boolean') throw new Error(`${where} is a checkbox; got ${JSON.stringify(value)}`);
    if (value) field.check();
    else field.uncheck();
  } else if (field instanceof PDFDropdown) {
    if (typeof value !== 'string') throw new Error(`${where} is a dropdown; got ${JSON.stringify(value)}`);
    field.select(value);
  } else if (field instanceof PDFTextField) {
    if (typeof value === 'boolean') throw new Error(`${where} is a text box; got ${value}`);
    setText(field, value, font, minFont);
  } else {
    throw new Error(`${where}: unsupported field type ${field.constructor.name}`);
  }
}

/** Write text at the box's own size, shrinking it (down to 6 pt) until it fits. */
function setText(field: PDFTextField, value: string | { text: string; fallback: string }, font: PDFFont, minFont: number) {
  const box = boxOf(field);
  const preferred = defaultSize(field);
  const attempt = (text: string) => {
    const multiline = text.includes('\n') || field.isMultiline();
    for (let size = preferred; size >= minFont; size -= 0.5) {
      if (fits(text, size, box, font, multiline)) return { text, size, multiline };
    }
    return null;
  };
  const fitted =
    typeof value === 'string'
      ? (attempt(value) ?? { text: value, size: minFont, multiline: value.includes('\n') })
      : (attempt(value.text) ?? attempt(value.fallback) ?? { text: value.fallback, size: minFont, multiline: false });

  const max = field.getMaxLength();
  if (max !== undefined && fitted.text.length > max) field.setMaxLength(undefined);
  if (fitted.multiline) field.enableMultiline();
  // One F370 box has no default appearance at all; give it the form's usual one.
  if (!field.acroField.getDefaultAppearance()) field.acroField.setDefaultAppearance('/Helv 0 Tf 0 g');
  field.setText(fitted.text);
  field.setFontSize(fitted.size);
  // Some boxes carry their own font size, which wins over the field's: set it there too.
  for (const widget of field.acroField.getWidgets()) {
    const da = widget.getDefaultAppearance();
    if (da) widget.setDefaultAppearance(da.replace(/[\d.]+(\s+Tf)/, `${fitted.size}$1`));
  }
}

/** The box's usable width and height, as the text runs (rotated widgets swap them). */
function boxOf(field: PDFTextField) {
  const widget = field.acroField.getWidgets()[0];
  const rect = widget.getRectangle();
  const mk = widget.dict.lookup(PDFName.of('MK')) as PDFDict | undefined;
  const rotation = (mk?.lookup(PDFName.of('R')) as PDFNumber | undefined)?.asNumber() ?? 0;
  const sideways = rotation % 180 !== 0;
  return { width: (sideways ? rect.height : rect.width) - 4, height: (sideways ? rect.width : rect.height) - 2 };
}

function defaultSize(field: PDFTextField): number {
  const da = field.acroField.getDefaultAppearance() ?? '';
  const size = Number(/([\d.]+)\s+Tf/.exec(da)?.[1] ?? 0);
  return size > 0 ? Math.min(size, DEFAULT_FONT) : DEFAULT_FONT;
}

function fits(text: string, size: number, box: { width: number; height: number }, font: PDFFont, multiline: boolean): boolean {
  if (!multiline) return font.widthOfTextAtSize(text, size) <= box.width && size <= box.height;
  const lines = wrap(text, size, box.width, font);
  return lines !== null && lines.length * size * 1.2 <= box.height;
}

/** Word-wrap to the width; null if a single word is wider than the box. */
function wrap(text: string, size: number, width: number, font: PDFFont): string[] | null {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) line = next;
      else if (font.widthOfTextAtSize(word, size) > width) return null;
      else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

/** Every field's current value by PDF field name (text, checked state, or selected option). */
export function readFields(doc: PDFDocument): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const f of doc.getForm().getFields()) {
    if (f instanceof PDFCheckBox) out[f.getName()] = f.isChecked();
    else if (f instanceof PDFTextField) out[f.getName()] = f.getText() ?? '';
    else if (f instanceof PDFDropdown) out[f.getName()] = f.getSelected()[0] ?? '';
  }
  return out;
}
