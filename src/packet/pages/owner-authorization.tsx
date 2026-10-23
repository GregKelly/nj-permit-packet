// Owner authorization: the owner's own signature backing up the contractor's
// F100 Agent Section (N.J.A.C. 5:23-2.15(d); kept by owner decision 2026-10-23).

import { Document, Text, View } from '@react-pdf/renderer';
import type { Determinations } from '../../engine';
import { money, oneLine } from '../entries';
import type { PacketJob, PacketProfile } from '../types';
import { footerText, s, Sheet } from './common';

export function OwnerAuthorization({ job, d, profile, prepared }: { job: PacketJob; d: Determinations; profile: PacketProfile; prepared: string }) {
  const me = profile.applicant;
  const site = { street: job.facts.property.address, city: String(job.facts.property.municipality), state: 'NJ', zip: job.site.zip };
  const parcel = [`Block ${job.site.block}`, `Lot ${job.site.lot}`, job.site.qualifier && `Qualifier ${job.site.qualifier}`].filter(Boolean).join(', ');
  const f100 = d.form_entries.F100;
  const subcodes = Object.keys(f100?.cost_by_subcode ?? {}).join(', ');
  const contractor = [me.name, me.address && oneLine(me.address), me.hic_registration && `HIC registration ${me.hic_registration}`].filter(Boolean).join(', ');

  return (
    <Document title={`Owner authorization ${job.ref}`} creator="Permit Packet" producer="Permit Packet">
      <Sheet footer={footerText(prepared, d.rules_version)}>
        <Text style={s.title}>Owner authorization</Text>
        <Text style={s.subtitle}>To accompany the Construction Permit Application (F100), Maplewood Construction Office</Text>

        <Text style={s.h2}>Property</Text>
        <Text>{oneLine(site)}</Text>
        <Text>{parcel}</Text>

        <Text style={s.h2}>Authorization</Text>
        <Text style={{ marginBottom: 6 }}>
          I, {job.owner.name}, am the owner in fee of the property above. I authorize {contractor}, to apply on my behalf for the construction
          permit for the work described in the attached scope of work, and to act as my agent with the construction office for this application.
        </Text>
        <Text style={{ marginBottom: 6 }}>
          Work: {f100?.proposed_work ?? ''}
          {subcodes && ` (${subcodes})`}
          {f100?.total_cost != null && `, estimated cost $${money(f100.total_cost)}`}.
        </Text>
        <Text style={s.muted}>
          The contractor signs the Agent Section on page 2 of the F100. This page adds the owner's own signature (N.J.A.C. 5:23-2.15(d)).
        </Text>

        <Text style={s.h2}>Owner</Text>
        {[0, 1].map((i) => (
          <View key={i} style={[s.row, { marginTop: 18 }]} wrap={false}>
            <View style={{ flex: 3, marginRight: 12 }}>
              <View style={s.signLine} />
              <Text style={s.small}>Signature</Text>
            </View>
            <View style={{ flex: 3, marginRight: 12 }}>
              <View style={s.signLine} />
              <Text style={s.small}>Printed name</Text>
            </View>
            <View style={{ flex: 1.4 }}>
              <View style={s.signLine} />
              <Text style={s.small}>Date</Text>
            </View>
          </View>
        ))}
        <Text style={[s.small, s.muted, { marginTop: 6 }]}>Second line for a co-owner, if any.</Text>
      </Sheet>
    </Document>
  );
}
