'use client';
// Review screen, left half: "What we understood". Every fact is editable; each change is
// saved and the engine re-runs, so the determinations on the right update at once.
// Also the manual path: with no AI, the contractor adds the work items here.

import { useEffect, useRef, useState, useTransition } from 'react';
import { FIXTURE_TYPES, PROPERTY_FACTS, UNKNOWN, WORK_ITEM_KINDS, type FactSpec } from '../../../src/engine/facts';
import type { JobRecord, RawFacts, TeamTrade } from '../../../src/jobs/types';
import { HOME_TYPE_LABELS } from '../../../src/parcel/units';
import { factLabel, humanize, KIND_LABELS, TRADE_LABELS, valueLabel } from '../../lib/labels';
import { editJob } from './actions';

type Item = Record<string, unknown> & { id: string; kind: string; label: string };
type State = { raw: RawFacts; team: JobRecord['team']; home_type: string };
export interface SubOption {
  id: number;
  trade: TeamTrade;
  name: string;
  note: string | null;
}

const COST_KEYS = ['total', 'building', 'electrical', 'plumbing', 'mechanical'];
const WORK_TRADES = ['building', 'electrical', 'plumbing', 'mechanical'];
const TEAM: TeamTrade[] = ['electrical', 'plumbing', 'hvacr'];
const HOME_TYPES = ['detached_1f', 'detached_2f', 'attached', 'three_or_more_units'];
/** Property facts the questions may ask; shown so an answer can be changed. */
const PROPERTY_EDITABLE = ['owner_occupied', 'own_sewer'];

const choices = (spec: Extract<FactSpec, { type: 'choice' }>) => (spec.unknown ? [...spec.values, UNKNOWN] : [...spec.values]);

function newItem(kind: string, items: Item[]): Item {
  let n = 1;
  while (items.some((i) => i.id === `${kind}_${n}`)) n++;
  const item: Item = { id: `${kind}_${n}`, kind, label: humanize(kind) };
  for (const [fact, spec] of Object.entries(WORK_ITEM_KINDS[kind])) {
    if (spec.type === 'choice') item[fact] = spec.unknown ? UNKNOWN : spec.default ?? spec.values[0];
    if (spec.type === 'fixtures') item[fact] = {};
  }
  return item;
}

export function FactsEditor({ jobId, initial, subs }: { jobId: number; initial: State; subs: SubOption[] }) {
  const [state, setState] = useState<State>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sent = useRef(JSON.stringify(initial));
  const [adding, setAdding] = useState('');

  // An answer given on the server (an inline question) changes the facts: take them, unless an edit is waiting.
  const initialJson = JSON.stringify(initial);
  useEffect(() => {
    if (initialJson !== sent.current && !timer.current) {
      sent.current = initialJson;
      setState(JSON.parse(initialJson));
    }
  }, [initialJson]);

  function change(next: State, wait = 400) {
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      sent.current = JSON.stringify(next);
      startSaving(async () => setError(await editJob(jobId, next)));
    }, wait);
  }

  const items = state.raw.work_items as Item[];
  const setItems = (work_items: Item[], wait?: number) => change({ ...state, raw: { ...state.raw, work_items } }, wait);
  const setItem = (id: string, patch: Record<string, unknown>, wait?: number) =>
    setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)), wait);
  function removeItem(id: string) {
    const performed_by = Object.fromEntries(
      Object.entries(state.raw.performed_by).map(([t, who]) => {
        if (typeof who !== 'object' || who === null) return [t, who];
        const owner = (who as { owner: string[] }).owner.filter((x) => x !== id);
        return [t, owner.length ? { owner } : 'contractor'];
      }),
    );
    change({ ...state, raw: { ...state.raw, work_items: items.filter((i) => i.id !== id), performed_by } }, 0);
  }

  return (
    <div>
      <h2>What we understood</h2>
      <p className="muted small">Check every fact. A change here re-runs the rules on the right. {saving ? 'Saving…' : ''}</p>
      {error && <div className="banner bad">{error}</div>}

      <div className="panel">
        <h3>Work items</h3>
        {items.length === 0 && <p className="muted">No work items yet. Add one below.</p>}
        {items.map((item) => (
          <div key={item.id} className="item">
            <div className="item-head">
              <span className="muted small">{KIND_LABELS[item.kind] ?? item.kind}</span>
              <button type="button" className="link small" onClick={() => removeItem(item.id)}>
                Remove
              </button>
            </div>
            <input id={`${item.id}-label`} type="text" aria-label="What this item is" value={item.label} onChange={(e) => setItem(item.id, { label: e.target.value })} />
            <div className="grid2">
              {Object.entries(WORK_ITEM_KINDS[item.kind] ?? {}).map(([fact, spec]) => (
                <Fact key={fact} kind={item.kind} fact={fact} spec={spec} value={item[fact]} onChange={(v, wait) => setItem(item.id, { [fact]: v }, wait)} id={`${item.id}-${fact}`} />
              ))}
            </div>
          </div>
        ))}
        <div className="grid2">
          <select aria-label="Kind of work to add" value={adding} onChange={(e) => setAdding(e.target.value)}>
            <option value="">Add a work item: pick a kind…</option>
            {Object.keys(WORK_ITEM_KINDS).map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k] ?? k}
              </option>
            ))}
          </select>
          <div>
            <button type="button" className="secondary" disabled={!adding} onClick={() => (setItems([...items, newItem(adding, items)], 0), setAdding(''))}>
              Add item
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Costs</h3>
        <p className="muted small">Contract value by trade, in dollars. Leave blank if not known.</p>
        <div className="grid2">
          {COST_KEYS.map((k) => (
            <div key={k}>
              <label htmlFor={`cost-${k}`}>{TRADE_LABELS[k]}</label>
              <input
                id={`cost-${k}`}
                type="number"
                min={0}
                value={state.raw.costs[k] ?? ''}
                onChange={(e) => change({ ...state, raw: { ...state.raw, costs: { ...state.raw.costs, [k]: e.target.value === '' ? null : Number(e.target.value) } } })}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>Who does the work</h3>
        <div className="grid2">
          {WORK_TRADES.map((t) => {
            const who = state.raw.performed_by[t] ?? 'contractor';
            const split = typeof who === 'object' && who !== null ? (who as { owner: string[] }).owner : null;
            const setWho = (v: unknown) => change({ ...state, raw: { ...state.raw, performed_by: { ...state.raw.performed_by, [t]: v } } }, 0);
            return (
              <div key={t}>
                <label htmlFor={`who-${t}`}>{TRADE_LABELS[t]}</label>
                <select
                  id={`who-${t}`}
                  value={split ? 'split' : String(who)}
                  onChange={(e) => setWho(e.target.value === 'split' ? { owner: items[0] ? [items[0].id] : [] } : e.target.value)}
                >
                  <option value="contractor">You and your subs</option>
                  <option value="owner">The owner, all of it</option>
                  <option value="split" disabled={!items.length}>
                    The owner, some items
                  </option>
                </select>
                {split &&
                  items.map((i) => (
                    <label key={i.id} className="inline">
                      <input
                        type="checkbox"
                        checked={split.includes(i.id)}
                        onChange={(e) => {
                          const owner = e.target.checked ? [...split, i.id] : split.filter((x) => x !== i.id);
                          setWho(owner.length ? { owner } : 'contractor');
                        }}
                      />
                      {i.label}
                    </label>
                  ))}
              </div>
            );
          })}
        </div>
        <h3>Subcontractors on this job</h3>
        <div className="grid2">
          {TEAM.map((t) => (
            <div key={t}>
              <label htmlFor={`team-${t}`}>{TRADE_LABELS[t]}</label>
              <select
                id={`team-${t}`}
                value={state.team[t] ?? ''}
                onChange={(e) => change({ ...state, team: { ...state.team, [t]: e.target.value === '' ? null : Number(e.target.value) } }, 0)}
              >
                <option value="">None</option>
                {subs
                  .filter((s) => s.trade === t)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.note ? ` (${s.note})` : ''}
                    </option>
                  ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>The property</h3>
        <div className="grid2">
          <div>
            <label htmlFor="home_type">Home type</label>
            <select id="home_type" value={state.home_type} onChange={(e) => change({ ...state, home_type: e.target.value }, 0)}>
              {HOME_TYPES.map((t) => (
                <option key={t} value={t}>
                  {HOME_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          {PROPERTY_EDITABLE.map((fact) => (
            <Fact
              key={fact}
              kind={null}
              fact={fact}
              spec={PROPERTY_FACTS[fact]}
              value={state.raw.property[fact] ?? UNKNOWN}
              onChange={(v) => change({ ...state, raw: { ...state.raw, property: { ...state.raw.property, [fact]: v } } }, 0)}
              id={`property-${fact}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Fact({ kind, fact, spec, value, onChange, id }: { kind: string | null; fact: string; spec: FactSpec; value: unknown; onChange: (v: unknown, wait?: number) => void; id: string }) {
  const label = <label htmlFor={id}>{factLabel(kind, fact)}</label>;
  switch (spec.type) {
    case 'choice': {
      const values = choices(spec);
      return (
        <div>
          {label}
          <select id={id} value={String(value ?? values[0])} onChange={(e) => onChange(e.target.value, 0)} className={value === UNKNOWN ? 'unknown' : ''}>
            {values.map((v) => (
              <option key={v} value={v}>
                {valueLabel(kind, fact, v)}
              </option>
            ))}
          </select>
        </div>
      );
    }
    case 'count':
      return (
        <div>
          {label}
          <input
            id={id}
            type="number"
            min={0}
            step={1}
            placeholder="Don't know"
            className={value === UNKNOWN || value === undefined ? 'unknown' : ''}
            value={typeof value === 'number' ? value : ''}
            onChange={(e) => onChange(e.target.value === '' ? UNKNOWN : Number(e.target.value))}
          />
        </div>
      );
    case 'text':
      return (
        <div>
          {label}
          <input id={id} type="text" value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value.trim() ? e.target.value : undefined)} />
        </div>
      );
    case 'fixtures': {
      const counts = (value ?? {}) as Record<string, number>;
      return (
        <div style={{ gridColumn: '1 / -1' }}>
          <label>Fixtures this item installs</label>
          <div className="fixtures">
            {FIXTURE_TYPES.map((f) => (
              <label key={f} className="inline">
                <input
                  type="number"
                  min={0}
                  step={1}
                  aria-label={humanize(f)}
                  value={counts[f] ?? ''}
                  onChange={(e) => {
                    const next = { ...counts };
                    const n = Number(e.target.value);
                    if (e.target.value === '' || n <= 0) delete next[f];
                    else next[f] = n;
                    onChange(next);
                  }}
                />
                {FIXTURE_LABELS[f]}
              </label>
            ))}
          </div>
        </div>
      );
    }
  }
}

const FIXTURE_LABELS: Record<string, string> = {
  water_closet: 'Toilet',
  lavatory: 'Bathroom sink',
  sink: 'Kitchen or other sink',
  bathtub: 'Bathtub',
  shower: 'Shower',
  dishwasher: 'Dishwasher',
  disposal: 'Disposal',
  washing_machine: 'Washing machine',
  floor_drain: 'Floor drain',
  hose_bibb: 'Hose bibb',
};
