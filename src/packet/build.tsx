// Builds the print-ready packet: our pages and the filled official forms,
// merged into one PDF in print order (M2 plan). Like the engine, it never
// reads the clock or the network: "today" is passed in, and the same inputs
// give the same bytes.

import { renderToBuffer } from '@react-pdf/renderer';
import { PDFDocument } from 'pdf-lib';
import type { ReactElement } from 'react';
import type { Determinations } from '../engine';
import { formValues } from './entries';
import { fillForm } from './fill';
import { CoverChecklist } from './pages/cover';
import { NoPermit } from './pages/no-permit';
import { OwnerAuthorization } from './pages/owner-authorization';
import { ScopeOfWork } from './pages/scope';
import type { PacketJob, PacketPart, PacketProfile, PacketResult } from './types';

/**
 * Print order: cover checklist, F100, owner authorization, technical sections
 * (in the rule data's form order: F110, F120, F130, F145, then F370), scope of work.
 * Jobs with no construction permit get the one-page "no permit needed" sheet.
 * Jobs the app can't handle get no packet, only the reason.
 */
export async function buildPacket(job: PacketJob, d: Determinations, profile: PacketProfile, today: string): Promise<PacketResult> {
  if (d.outcome === 'out_of_scope') return { kind: 'none', reason: d.flags.map((f) => f.message).join(' ') };
  if (d.outcome === 'cannot_classify') {
    const items = d.items.filter((i) => i.error).map((i) => `"${i.label}": ${i.error}`);
    return { kind: 'none', reason: items.join(' ') };
  }

  const parts: { part: PacketPart['part']; form?: string; doc: PDFDocument }[] = [];
  const page = async (part: PacketPart['part'], element: ReactElement) => parts.push({ part, doc: await PDFDocument.load(await renderToBuffer(element as never)) });

  if (d.outcome === 'no_permit' || d.outcome === 'zoning_only') {
    await page('no_permit', <NoPermit job={job} d={d} prepared={today} />);
    return assemble('no_permit', parts, job, today);
  }

  const values = formValues(job, d, profile);
  await page('cover', <CoverChecklist job={job} d={d} prepared={today} />);
  for (const f of d.forms) {
    parts.push({ part: 'form', form: f.form, doc: await fillForm(f.form, values[f.form]) });
    if (f.form === 'F100') await page('owner_authorization', <OwnerAuthorization job={job} d={d} profile={profile} prepared={today} />);
  }
  await page('scope', <ScopeOfWork job={job} d={d} prepared={today} />);
  return assemble('packet', parts, job, today);
}

async function assemble(kind: 'packet' | 'no_permit', parts: { part: PacketPart['part']; form?: string; doc: PDFDocument }[], job: PacketJob, today: string): Promise<PacketResult> {
  const out = await PDFDocument.create({ updateMetadata: false });
  const date = new Date(`${today}T12:00:00Z`);
  out.setTitle(`${kind === 'packet' ? 'Permit packet' : 'No permit needed'}: ${job.facts.property.address} (${job.ref})`);
  out.setCreator('Permit Packet');
  out.setProducer('Permit Packet (pdf-lib)');
  out.setCreationDate(date);
  out.setModificationDate(date);

  const pages: PacketPart[] = [];
  for (const p of parts) {
    const copied = await out.copyPages(p.doc, p.doc.getPageIndices());
    pages.push({ part: p.part, ...(p.form ? { form: p.form } : {}), start: out.getPageCount() + 1, pages: copied.length });
    copied.forEach((c) => out.addPage(c));
  }
  return { kind, pdf: await out.save(), pages };
}
