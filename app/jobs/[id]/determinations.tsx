// Review screen, right half: "What that means". Everything here is the engine's, with its reasons.

import type { Determinations, Outcome } from '../../../src/engine';
import { TRADE_LABELS } from '../../lib/labels';

const OUTCOMES: Record<Outcome, { title: string; tone: 'ok' | 'warn' | 'bad' | 'info' }> = {
  permit: { title: 'Construction permit needed', tone: 'info' },
  minor_work: { title: 'Minor work permit', tone: 'info' },
  no_permit: { title: 'No construction permit needed', tone: 'ok' },
  zoning_only: { title: 'No construction permit, but a zoning permit', tone: 'warn' },
  cannot_classify: { title: "Call the construction office: some work isn't covered by the rules", tone: 'warn' },
  out_of_scope: { title: "Stop: this isn't a job Permit Packet handles", tone: 'bad' },
};
const TIERS = { OM: 'Ordinary maintenance', MW: 'Minor work', FULL: 'Full permit' } as const;
const ZONING = { required: 'Zoning application required', not_required: 'No zoning application', probably_not_required: 'Probably no zoning application: confirm with Zoning' } as const;
const money = (n: number | null | undefined) => (n == null ? 'not given' : `$${n.toLocaleString('en-US')}`);

export function DeterminationsView({ d }: { d: Determinations }) {
  const o = OUTCOMES[d.outcome];
  const f100 = d.form_entries.F100;
  return (
    <div>
      <h2>What that means</h2>
      <div className={`banner ${o.tone}`}>
        <div className="big">{o.title}</div>
      </div>

      {d.flags.map((f) => (
        <div key={f.id} className={`banner ${f.blocks_printing ? 'bad' : 'warn'}`}>
          {f.message} <span className="muted small">({f.id}{f.blocks_printing ? ', blocks printing' : ''})</span>
        </div>
      ))}

      <div className="panel">
        <h3>Each work item</h3>
        {d.items.map((i) => (
          <div key={i.item_id} className="item">
            <strong>{i.label}</strong> {i.tier && <span className="tag">{TIERS[i.tier]}</span>}
            {i.forms.map((form) => (
              <span key={form} className="tag">
                {form}
              </span>
            ))}
            <div>{i.error ?? i.reason}</div>
            <div className="muted small">
              {i.rule_id ?? 'No rule'}
              {i.citation ? ` · ${i.citation}` : ''}
            </div>
            {i.assumed_unknown.length > 0 && (
              <div className="small" style={{ color: 'var(--warn)' }}>
                Assumed the stricter case because unknown: {i.assumed_unknown.join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>

      {d.forms.length > 0 && (
        <div className="panel">
          <h3>Forms and who signs</h3>
          <table>
            <tbody>
              {d.forms.map((f) => (
                <tr key={f.form}>
                  <td>
                    <strong>{f.form}</strong> {f.name}
                  </td>
                  <td>
                    Signed by {f.signer ?? <span style={{ color: 'var(--bad)' }}>nobody yet: pick one</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {f100?.cost_by_subcode && (
            <p className="small">
              F100 estimated cost:{' '}
              {Object.entries(f100.cost_by_subcode)
                .map(([t, c]) => `${TRADE_LABELS[t] ?? t} ${money(c)}`)
                .join(' · ')}
              {' · '}total {money(f100.total_cost)}
            </p>
          )}
        </div>
      )}

      {(d.zoning || d.plans) && (
        <div className="panel">
          {d.zoning && (
            <>
              <h3>Zoning</h3>
              <div>
                <strong>{ZONING[d.zoning.status]}</strong> <span className="muted small">({d.zoning.rule_id})</span>
              </div>
              <div>{d.zoning.message}</div>
              {d.zoning.checklist.length > 0 && (
                <ul>
                  {d.zoning.checklist.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
            </>
          )}
          {d.plans && (
            <>
              <h3>Plans</h3>
              <div>
                {d.plans.message} <span className="muted small">({d.plans.rule_id})</span>
              </div>
            </>
          )}
        </div>
      )}

      {[...d.tips, ...d.owner_notes].length > 0 && (
        <div className="panel">
          <h3>Tips</h3>
          <ul>
            {[...d.tips, ...d.owner_notes].map((t) => (
              <li key={t.id}>{t.text}</li>
            ))}
          </ul>
        </div>
      )}

      {d.assumptions_applied.length > 0 && (
        <div className="panel">
          <h3>Assumptions this result relies on</h3>
          <ul>
            {d.assumptions_applied.map((a) => (
              <li key={a.id}>
                {a.text} <span className="muted small">To confirm: {a.confirm_with}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {d.office_questions.length > 0 && (
        <div className="panel">
          <h3>Questions for the construction office</h3>
          <ul>
            {d.office_questions.map((q) => (
              <li key={q.id}>{q.text}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="muted small">Rules version {d.rules_version}</p>
    </div>
  );
}
