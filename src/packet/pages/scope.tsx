// Scope of work for the plan reviewer. In M2 a plain list: each work item
// grouped by trade with that trade's cost. M3 adds the AI-written narrative
// above it; the list stays as the fallback.

import { Document, Text, View } from '@react-pdf/renderer';
import type { Determinations, FormEntries } from '../../engine';
import { money, oneLine } from '../entries';
import type { PacketJob } from '../types';
import { Bullet, footerText, s, Sheet } from './common';

const TRADES: [form: string, trade: string][] = [
  ['F110', 'Building'],
  ['F120', 'Electrical'],
  ['F130', 'Plumbing'],
  ['F145', 'Mechanical'],
];

const tradeCost = (e: FormEntries | undefined) => (e ? (e.rehabilitation_cost ?? e.est_cost ?? null) : null);

export function ScopeOfWork({ job, d, prepared }: { job: PacketJob; d: Determinations; prepared: string }) {
  const site = { street: job.facts.property.address, city: String(job.facts.property.municipality), state: 'NJ', zip: job.site.zip };
  const om = d.items.filter((i) => i.tier === 'OM');
  const total = d.form_entries.F100?.total_cost;

  return (
    <Document title={`Scope of work ${job.ref}`} creator="Permit Packet" producer="Permit Packet">
      <Sheet footer={footerText(prepared, d.rules_version)}>
        <Text style={s.title}>Scope of work</Text>
        <Text style={s.subtitle}>
          {oneLine(site)} · Block {job.site.block}, Lot {job.site.lot} · Owner: {job.owner.name} · Contractor: {job.facts.team.applicant.name}
        </Text>

        {TRADES.filter(([form]) => d.forms.some((f) => f.form === form)).map(([form, trade]) => {
          const cost = tradeCost(d.form_entries[form]);
          return (
            <View key={form} wrap={false}>
              <Text style={s.h2}>
                {trade} ({form}) {cost === null ? '' : `$${money(cost)}`}
              </Text>
              {d.items
                .filter((i) => i.forms.includes(form))
                .map((i) => (
                  <Bullet key={i.item_id}>{i.label}</Bullet>
                ))}
            </View>
          );
        })}

        {om.length > 0 && (
          <View wrap={false}>
            <Text style={s.h2}>Also in this job (ordinary maintenance, no permit needed)</Text>
            {om.map((i) => (
              <Bullet key={i.item_id}>{i.label}</Bullet>
            ))}
          </View>
        )}

        {total != null && <Text style={[s.h2, { marginTop: 16 }]}>Total estimated cost of permitted work: ${money(total)}</Text>}
      </Sheet>
    </Document>
  );
}
