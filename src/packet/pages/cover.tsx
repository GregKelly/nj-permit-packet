// Cover checklist: for the contractor, not the office. What to do in order,
// who signs where, what's still to fill in, what to attach, and what the
// packet assumes (M2 plan, "What's in the packet").

import { Document, Text, View } from '@react-pdf/renderer';
import type { Determinations } from '../../engine';
import { oneLine } from '../entries';
import type { PacketJob } from '../types';
import { Bullet, footerText, Numbered, s, Sheet } from './common';

/** Where each form is signed, as printed on the form. */
const SIGN_WHERE: Record<string, string> = {
  F100: 'Page 2, Agent Section: Signature (Check if contractor, name and address are filled in)',
  F110: 'Section C: Sign here, Print name here',
  F120: 'Section C: Sign and Seal here, Print name here',
  F130: 'Section C: Sign and Seal here, Print name here',
  F145: 'Section C: Sign and Seal here, Print name here',
  F370: 'Bottom: check one verification statement, Signature, Date. Also completes the type of replacement, appliances and venting',
};

const OUTCOME: Record<string, string> = {
  permit: 'Permit required before work starts',
  minor_work: 'Minor work: notify the office before starting, file within 5 business days',
};

export function CoverChecklist({ job, d, prepared }: { job: PacketJob; d: Determinations; prepared: string }) {
  const site = { street: job.facts.property.address, city: String(job.facts.property.municipality), state: 'NJ', zip: job.site.zip };
  const parcel = [`Block ${job.site.block}`, `Lot ${job.site.lot}`, job.site.qualifier && `Qualifier ${job.site.qualifier}`].filter(Boolean).join(', ');

  const steps: { text: string; sub?: string[] }[] = [];
  if (d.outcome === 'minor_work') {
    steps.push({ text: 'Notify the construction office before work starts.' });
    steps.push({ text: 'File this packet within 5 business days of the notice.' });
  }
  if (d.zoning?.status === 'required') steps.push({ text: d.zoning.message, sub: d.zoning.checklist });
  else if (d.zoning?.status === 'probably_not_required') steps.push({ text: d.zoning.message });
  // Plans: a requirement, or a heads-up tied to specific work (PL-03); not the plain "no plans needed".
  if (d.plans && (d.plans.requirement !== 'none' || d.plans.because.length > 0)) steps.push({ text: d.plans.message });
  steps.push({ text: 'Get every signature in the table below, and have each sub fill in what is listed for them.' });
  for (const line of d.submission) steps.push({ text: line.text });

  const attach: string[] = [];
  if (d.plans?.requirement === 'sealed') attach.push('Plans sealed by an NJ-licensed architect or engineer');
  if (d.plans?.requirement === 'floor_plan') attach.push('Floor plan (an unsealed contractor sketch is assumed acceptable, A-7)');
  if (d.zoning?.status === 'required') attach.push('Zoning approval from Maplewood Zoning, and a copy of the survey you submitted with it');
  if (d.forms.some((f) => f.form === 'F370')) attach.push('If a chimney liner is being installed: all of the liner documentation (F370)');

  const signers = d.forms.map((f) => ({
    form: f.form,
    where: SIGN_WHERE[f.form] ?? 'Signature line',
    who: f.form === 'F100' ? job.facts.team.applicant.name : (f.signer ?? 'MISSING: add the sub who will sign this'),
  }));
  signers.splice(1, 0, { form: 'Owner authorization', where: 'Signature, printed name and date', who: job.owner.name });

  return (
    <Document title={`Cover checklist ${job.ref}`} creator="Permit Packet" producer="Permit Packet">
      <Sheet footer={footerText(prepared, d.rules_version)}>
        <Text style={s.title}>Permit packet: {job.facts.property.address}</Text>
        <Text style={s.subtitle}>Cover checklist for {job.facts.team.applicant.name}</Text>
        <Text style={s.banner}>Keep this page, don't submit it.</Text>

        {d.flags.map((f) => (
          <View key={f.id} style={s.warning} wrap={false}>
            <Text style={s.warningTitle}>WARNING ({f.id})</Text>
            <Text>{f.message}</Text>
          </View>
        ))}

        <Text style={s.h2}>Job</Text>
        <Bullet>{oneLine(site)} · {parcel}</Bullet>
        <Bullet>Owner: {job.owner.name}</Bullet>
        <Bullet>
          {OUTCOME[d.outcome] ?? d.outcome} ({d.job_tier})
        </Bullet>
        <Bullet>Forms in this packet: {d.forms.map((f) => f.form).join(', ')}, plus the owner authorization page and the scope of work</Bullet>
        {d.zoning?.status === 'not_required' && <Bullet>Zoning: {d.zoning.message}</Bullet>}

        <Text style={s.h2}>Steps, in order</Text>
        {steps.map((step, i) => (
          <Numbered key={i} n={i + 1}>
            <Text>{step.text}</Text>
            {step.sub?.map((x) => (
              <Bullet key={x} mark="[ ]">
                {x}
              </Bullet>
            ))}
          </Numbered>
        ))}

        <Text style={s.h2}>Who signs where</Text>
        <View style={s.table}>
          <View style={[s.tr, s.th]}>
            <Text style={{ width: 90 }}>Form</Text>
            <Text style={{ width: 150 }}>Signer</Text>
            <Text style={s.grow}>Where</Text>
          </View>
          {signers.map((x) => (
            <View key={x.form} style={s.tr} wrap={false}>
              <Text style={[{ width: 90 }, s.bold]}>{x.form}</Text>
              <Text style={{ width: 150 }}>{x.who}</Text>
              <Text style={s.grow}>{x.where}</Text>
            </View>
          ))}
        </View>
        {d.fill_ins.length > 0 && (
          <>
            <Text style={[s.bold, { marginTop: 6 }]}>Still to fill in by hand (details the job description didn't give)</Text>
            {d.fill_ins.map((f) => (
              <Bullet key={f.form} mark="[ ]">
                {f.signer ?? f.form}: fill in {f.details.join(', ')} on {f.form}
              </Bullet>
            ))}
          </>
        )}

        {attach.length > 0 && (
          <>
            <Text style={s.h2}>What to attach</Text>
            {attach.map((a) => (
              <Bullet key={a} mark="[ ]">
                {a}
              </Bullet>
            ))}
          </>
        )}

        {d.tips.length > 0 && (
          <>
            <Text style={s.h2}>Reviewer tips</Text>
            {d.tips.map((t) => (
              <Bullet key={t.id}>
                <Text style={s.bold}>{t.id}</Text> {t.text}
              </Bullet>
            ))}
          </>
        )}

        <Text style={s.h2}>Assumptions this packet relies on</Text>
        {d.assumptions_applied.map((a) => (
          <Text key={a.id} style={[s.small, { marginBottom: 1 }]}>
            <Text style={s.bold}>{a.id}</Text> {a.text}. <Text style={s.muted}>Confirm with: {a.confirm_with}.</Text>
          </Text>
        ))}
      </Sheet>
    </Document>
  );
}
