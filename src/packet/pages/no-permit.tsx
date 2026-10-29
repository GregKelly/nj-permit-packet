// "No permit needed": printed instead of a packet when every item is ordinary
// maintenance. Lists each item with its rule and reason, plus any zoning note.

import { Document, Text, View } from '@react-pdf/renderer';
import type { Determinations } from '../../engine';
import { oneLine } from '../entries';
import type { PacketJob } from '../types';
import { Bullet, footerText, s, Sheet } from './common';
import { NotInPacket } from './cover';

export function NoPermit({ job, d, prepared }: { job: PacketJob; d: Determinations; prepared: string }) {
  const site = { street: job.facts.property.address, city: String(job.facts.property.municipality), state: 'NJ', zip: job.site.zip };
  const zoningOnly = d.outcome === 'zoning_only';

  return (
    <Document title={`No permit needed ${job.ref}`} creator="Permit Packet" producer="Permit Packet">
      <Sheet footer={footerText(prepared, d.rules_version)}>
        <Text style={s.title}>{zoningOnly ? 'No construction permit needed, but a zoning permit applies' : 'No permit needed'}</Text>
        <Text style={s.subtitle}>
          {oneLine(site)} · Block {job.site.block}, Lot {job.site.lot} · Owner: {job.owner.name}
        </Text>
        <Text style={{ marginBottom: 8 }}>
          Every item in this job is ordinary maintenance under the NJ Uniform Construction Code, so no construction permit is required
          (N.J.A.C. 5:23-2.7). Keep this sheet with the job file.
        </Text>

        <View style={[s.table, s.small]}>
          <View style={[s.tr, s.th]}>
            <Text style={{ width: 150 }}>Work item</Text>
            <Text style={{ width: 42 }}>Rule</Text>
            <Text style={s.grow}>Why no permit</Text>
          </View>
          {d.items.map((i) => (
            <View key={i.item_id} style={s.tr} wrap={false}>
              <Text style={{ width: 150, paddingRight: 6 }}>{i.label}</Text>
              <Text style={[{ width: 42 }, s.bold]}>{i.rule_id}</Text>
              <Text style={s.grow}>
                {i.reason}
                {i.citation ? ` (${i.citation})` : ''}
              </Text>
            </View>
          ))}
        </View>

        {d.zoning && (
          <>
            <Text style={s.h2}>Zoning</Text>
            <Text>{d.zoning.message}</Text>
            {d.zoning.checklist.map((c) => (
              <Bullet key={c} mark="[ ]">
                {c}
              </Bullet>
            ))}
          </>
        )}

        <NotInPacket items={job.not_in_packet} />

        {d.tips.length > 0 && (
          <>
            <Text style={s.h2}>Tips</Text>
            {d.tips.map((t) => (
              <Bullet key={t.id}>
                <Text style={s.bold}>{t.id}</Text> {t.text}
              </Bullet>
            ))}
          </>
        )}

        {d.assumptions_applied.length > 0 && (
          <>
            <Text style={s.h2}>Assumptions this relies on</Text>
            <View style={s.small}>
              {d.assumptions_applied.map((a) => (
                <Bullet key={a.id}>
                  <Text style={s.bold}>{a.id}</Text> {a.text}. <Text style={s.muted}>Confirm with: {a.confirm_with}.</Text>
                </Bullet>
              ))}
            </View>
          </>
        )}
      </Sheet>
    </Document>
  );
}
