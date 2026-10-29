'use client';
// Describe screen: work site (looked up in the state parcel data, or typed), home type, owner, description.

import { useState, useTransition } from 'react';
import { PATTERNS } from '../../../src/jobs/contact';
import type { NewJob } from '../../../src/jobs/types';
import type { ParcelCandidate } from '../../../src/parcel/lookup';
import { HOME_TYPE_LABELS, unitsMismatch } from '../../../src/parcel/units';
import { createJob, findParcels } from './actions';

const HOME_TYPES = ['detached_1f', 'detached_2f', 'attached', 'three_or_more_units'];

export function DescribeForm() {
  const [street, setStreet] = useState('');
  const [town, setTown] = useState('Maplewood');
  const [zip, setZip] = useState('07040');
  const [candidates, setCandidates] = useState<ParcelCandidate[] | null>(null);
  const [lookupNote, setLookupNote] = useState<string | null>(null);
  const [picked, setPicked] = useState<ParcelCandidate | null>(null);
  const [block, setBlock] = useState('');
  const [lot, setLot] = useState('');
  const [qualifier, setQualifier] = useState('');
  const [homeType, setHomeType] = useState('');
  const [owner, setOwner] = useState({ name: '', street: '', city: '', state: 'NJ', zip: '', phone: '', email: '' });
  const [sameAsSite, setSameAsSite] = useState(true);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [looking, startLookup] = useTransition();
  const [saving, startSave] = useTransition();

  const units = picked?.dwelling_units ?? null;
  const mismatch = homeType ? unitsMismatch(homeType, units) : null;

  function lookup() {
    setError(null);
    startLookup(async () => {
      const r = await findParcels(street, town);
      setPicked(null);
      if (r.ok) {
        setCandidates(r.candidates);
        setLookupNote(null);
        if (r.candidates.length === 1) pick(r.candidates[0]);
      } else {
        setCandidates(null);
        setLookupNote(r.message);
      }
    });
  }

  function pick(c: ParcelCandidate) {
    setPicked(c);
    setBlock(c.block);
    setLot(c.lot);
    setQualifier(c.qualifier ?? '');
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // A typed block/lot that differs from the picked record is the contractor's correction: the record's other fields no longer apply.
    const fromRecord = picked && picked.block === block.trim() && picked.lot === lot.trim() ? picked : null;
    const input: NewJob = {
      site: {
        street: street.trim(),
        municipality: fromRecord?.municipality ?? town.trim(),
        zip: zip.trim(),
        block: block.trim(),
        lot: lot.trim(),
        ...(qualifier.trim() ? { qualifier: qualifier.trim() } : {}),
        prop_class: fromRecord?.prop_class ?? '2',
        year_built: fromRecord?.year_built ?? null,
        dwelling_units: fromRecord?.dwelling_units ?? null,
        ...(fromRecord ? { parcel_address: fromRecord.address } : {}),
      },
      home_type: homeType,
      owner: {
        name: owner.name.trim(),
        address: sameAsSite
          ? { street: street.trim(), city: town.trim(), state: 'NJ', zip: zip.trim() }
          : { street: owner.street.trim(), city: owner.city.trim(), state: owner.state.trim() || 'NJ', zip: owner.zip.trim() },
        ...(owner.phone.trim() ? { phone: owner.phone.trim() } : {}),
        ...(owner.email.trim() ? { email: owner.email.trim() } : {}),
      },
      description: description.trim(),
    };
    if (!input.description) return setError('Describe the job.');
    startSave(async () => {
      const message = await createJob(input);
      if (message) setError(message);
    });
  }

  return (
    <form onSubmit={submit}>
      <h2>Work site</h2>
      <div className="panel">
        <div className="grid2">
          <div>
            <label htmlFor="street">Street address</label>
            <input id="street" type="text" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="34 Oakview Ave" required />
          </div>
          <div className="grid2">
            <div>
              <label htmlFor="town">Town</label>
              <input id="town" type="text" value={town} onChange={(e) => setTown(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="zip">ZIP</label>
              <input id="zip" type="text" inputMode="numeric" value={zip} onChange={(e) => setZip(e.target.value)} required {...PATTERNS.zip} />
            </div>
          </div>
        </div>
        <button type="button" className="secondary" onClick={lookup} disabled={looking || !street.trim()}>
          {looking ? 'Looking up…' : 'Look up block and lot'}
        </button>
        {lookupNote && <div className="banner warn">{lookupNote}</div>}
        {candidates && (
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Tax record address</th>
                <th>Block</th>
                <th>Lot</th>
                <th>Qual.</th>
                <th>Class</th>
                <th>Built</th>
                <th>Units</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => {
                const key = `${c.block}/${c.lot}/${c.qualifier ?? ''}`;
                return (
                  <tr key={key}>
                    <td>
                      <input type="radio" name="parcel" aria-label={c.address} checked={picked === c} onChange={() => pick(c)} />
                    </td>
                    <td>{c.address}</td>
                    <td>{c.block}</td>
                    <td>{c.lot}</td>
                    <td>{c.qualifier}</td>
                    <td>{c.prop_class}</td>
                    <td>{c.year_built ?? '—'}</td>
                    <td>{c.dwelling_units ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div className="grid2">
          <div className="grid2">
            <div>
              <label htmlFor="block">Block</label>
              <input id="block" type="text" value={block} onChange={(e) => setBlock(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="lot">Lot</label>
              <input id="lot" type="text" value={lot} onChange={(e) => setLot(e.target.value)} required />
            </div>
          </div>
          <div>
            <label htmlFor="qualifier">Qualifier (if any)</label>
            <input id="qualifier" type="text" value={qualifier} onChange={(e) => setQualifier(e.target.value)} />
          </div>
        </div>
        {picked?.year_built && <p className="muted small">Tax records: built {picked.year_built}.</p>}
      </div>

      <h2>Home type</h2>
      <div className="panel">
        {HOME_TYPES.map((t) => (
          <label key={t} className="inline">
            <input type="radio" name="home_type" value={t} checked={homeType === t} onChange={() => setHomeType(t)} required /> {HOME_TYPE_LABELS[t]}
          </label>
        ))}
        {units !== null && (
          <p className="muted small">
            Tax records: {units} dwelling unit{units === 1 ? '' : 's'}. A check only; the record can't tell a detached house from a twin.
          </p>
        )}
        {mismatch && <div className="banner warn">{mismatch}</div>}
        {homeType === 'three_or_more_units' && !mismatch && (
          <div className="banner warn">Permit Packet handles one- and two-family homes only. This job will stop as out of scope.</div>
        )}
      </div>

      <h2>Owner</h2>
      <div className="panel">
        <div className="grid2">
          <div>
            <label htmlFor="owner">Owner name</label>
            <input id="owner" type="text" value={owner.name} onChange={(e) => setOwner({ ...owner, name: e.target.value })} required />
          </div>
          <div>
            <label htmlFor="owner_phone">Phone</label>
            <input id="owner_phone" type="tel" value={owner.phone} onChange={(e) => setOwner({ ...owner, phone: e.target.value })} placeholder="973-555-0101" {...PATTERNS.phone} />
          </div>
          <div>
            <label htmlFor="owner_email">Email</label>
            <input id="owner_email" type="email" value={owner.email} onChange={(e) => setOwner({ ...owner, email: e.target.value })} />
          </div>
        </div>
        <label className="inline">
          <input type="checkbox" checked={sameAsSite} onChange={(e) => setSameAsSite(e.target.checked)} /> Mailing address is the work site
        </label>
        {!sameAsSite && (
          <div className="grid2">
            {(['street', 'city', 'state', 'zip'] as const).map((k) => (
              <div key={k}>
                <label htmlFor={`owner_${k}`}>{k === 'zip' ? 'ZIP' : k[0].toUpperCase() + k.slice(1)}</label>
                <input id={`owner_${k}`} type="text" value={owner[k]} onChange={(e) => setOwner({ ...owner, [k]: e.target.value })} />
              </div>
            ))}
          </div>
        )}
      </div>

      <h2>The job</h2>
      <div className="panel">
        <label htmlFor="description">Describe the work, as you would to the owner</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={8}
          placeholder="Kitchen remodel: new cabinets and counters, move the sink to the island, add a dishwasher, four new outlets…"
          required
        />
        <p className="muted small">Only this description goes to the AI. Owner details, your business details and your subcontractors stay on this computer.</p>
      </div>

      {error && <div className="banner bad">{error}</div>}
      <button type="submit" disabled={saving}>
        {saving ? 'Reading the description…' : 'Next'}
      </button>
    </form>
  );
}
