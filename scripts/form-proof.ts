// Prints a proof sheet for an official form: every text box filled with its own
// PDF field name, every checkbox and dropdown checked and labelled in red with
// its name. Hold it next to assets/forms/<form>.map.yaml to check the map.
// Usage: npm run form-proof -- F120      (writes out/proof-F120.pdf)

import { mkdirSync, writeFileSync } from 'node:fs';
import { PDFCheckBox, PDFDocument, PDFDropdown, PDFTextField, StandardFonts, degrees, rgb, type PDFPage } from 'pdf-lib';
import { fillByPdfName, type FieldValue } from '../src/packet/fill';
import { officialForm, officialForms } from '../src/packet/forms';

const id = process.argv[2];
if (!id || !officialForms().has(id)) {
  console.error(`Usage: npm run form-proof -- <form: ${[...officialForms().keys()].join(', ')}>`);
  process.exit(1);
}

const blank = await PDFDocument.load(officialForm(id).bytes);
const values: Record<string, FieldValue> = {};
const labels: { name: string; ref: unknown; x: number; y: number; w: number; h: number }[] = [];
for (const f of blank.getForm().getFields()) {
  if (f instanceof PDFTextField) values[f.getName()] = f.getName();
  if (f instanceof PDFCheckBox) values[f.getName()] = true;
  if (f instanceof PDFCheckBox || f instanceof PDFDropdown) {
    for (const w of f.acroField.getWidgets()) {
      const r = w.getRectangle();
      labels.push({ name: f.getName(), ref: w.P(), x: r.x, y: r.y, w: r.width, h: r.height });
    }
  }
}

// Tiny boxes (quantity columns) get tiny names: zoom in on screen to read them.
const doc = await fillByPdfName(id, values, { minFont: 2.5 });
const font = await doc.embedFont(StandardFonts.Helvetica);
const pages = doc.getPages();
const red = rgb(0.85, 0, 0);
for (const l of labels) {
  const page: PDFPage | undefined = pages.find((p) => p.ref === l.ref) ?? pages[0];
  const rotation = page.getRotation().angle % 360;
  // Write the label just past the box's right edge as the page is read.
  const at =
    rotation === 270 ? { x: l.x + 1, y: l.y - 2 } : rotation === 90 ? { x: l.x + l.w - 1, y: l.y + l.h + 2 } : { x: l.x + l.w + 2, y: l.y + 1 };
  const size = 5.5;
  const rotate = degrees(rotation);
  const width = font.widthOfTextAtSize(l.name, size);
  const back = rotation === 270 ? { x: at.x - 1.5, y: at.y + 1 } : rotation === 90 ? { x: at.x + 1.5, y: at.y - 1 } : { x: at.x - 1, y: at.y - 1.5 };
  page.drawRectangle({ ...back, width: width + 2, height: size + 1.5, color: rgb(1, 1, 1), opacity: 0.9, rotate });
  page.drawText(l.name, { ...at, size, font, color: red, rotate });
}

mkdirSync('out', { recursive: true });
const file = `out/proof-${id}.pdf`;
writeFileSync(file, await doc.save());
console.log(`Wrote ${file}. Compare each name with assets/forms/${id}.map.yaml.`);
