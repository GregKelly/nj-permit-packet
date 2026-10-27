import { connection } from 'next/server';
import type { SavedSub } from '../../src/db';
import { store, today } from '../lib/app';
import { Submit } from '../ui/submit';
import { deleteSub, saveProfile, saveSub } from './actions';

const TRADES = { electrical: 'Electrical', plumbing: 'Plumbing', hvacr: 'HVACR' } as const;

/** Days until a date (negative once it's past). */
const daysUntil = (date: string, from: string) => Math.round((Date.parse(date) - Date.parse(from)) / 86_400_000);

function Expiry({ date }: { date: string }) {
  const days = daysUntil(date, today());
  if (days < 0) return <span className="tag" style={{ color: 'var(--bad)' }}>Expired {date}: the office will likely reject this sub's section (LC-03)</span>;
  if (days <= 30) return <span className="tag" style={{ color: 'var(--warn)' }}>Expires {date}, in {days} days</span>;
  return <span className="muted small">Expires {date}</span>;
}

function AddressFields({ a }: { a?: { street: string; city: string; state: string; zip: string } }) {
  return (
    <div className="grid2">
      <div>
        <label>Street</label>
        <input type="text" name="street" defaultValue={a?.street} />
      </div>
      <div>
        <label>City</label>
        <input type="text" name="city" defaultValue={a?.city} />
      </div>
      <div>
        <label>State</label>
        <input type="text" name="state" defaultValue={a?.state ?? 'NJ'} />
      </div>
      <div>
        <label>ZIP</label>
        <input type="text" name="zip" defaultValue={a?.zip} inputMode="numeric" />
      </div>
    </div>
  );
}

function SubForm({ sub }: { sub?: SavedSub }) {
  return (
    <form action={saveSub}>
      {sub && <input type="hidden" name="id" value={sub.id} />}
      <div className="grid2">
        <div>
          <label>Trade</label>
          <select name="trade" defaultValue={sub?.trade ?? ''} required>
            <option value="" disabled>
              Pick one
            </option>
            {Object.entries(TRADES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Company name</label>
          <input type="text" name="name" defaultValue={sub?.name} required />
        </div>
        <div>
          <label>License number</label>
          <input type="text" name="license" defaultValue={sub?.license} required />
        </div>
        <div>
          <label>License expires</label>
          <input type="date" name="expires" defaultValue={sub?.expires} required />
        </div>
        <div>
          <label>Phone</label>
          <input type="tel" name="phone" defaultValue={sub?.phone} />
        </div>
        <div>
          <label>Email</label>
          <input type="email" name="email" defaultValue={sub?.email} />
        </div>
        <div>
          <label>FEIN (optional)</label>
          <input type="text" name="fein" defaultValue={sub?.fein} />
        </div>
      </div>
      <AddressFields a={sub?.address} />
      <label className="inline">
        <input type="checkbox" name="usual" defaultChecked={sub?.usual} /> My usual {sub ? TRADES[sub.trade].toLowerCase() : ''} sub (picked for new jobs)
      </label>
      <div>
        <Submit>{sub ? 'Save changes' : 'Add subcontractor'}</Submit>
      </div>
    </form>
  );
}

export default async function SetupPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await connection();
  const { ok, error } = await searchParams;
  const p = store().getProfile();
  const subs = store().listSubs();

  return (
    <>
      <h1>Setup</h1>
      <p className="muted">Entered once, used on every packet. All of this stays on this computer; none of it is sent to the AI.</p>
      {ok && <div className="banner ok">{ok}</div>}
      {error && <div className="banner bad">{error}</div>}

      <h2>Your business</h2>
      <form action={saveProfile} className="panel">
        <div className="grid2">
          <div>
            <label>Business name</label>
            <input type="text" name="name" defaultValue={p?.name} required />
          </div>
          <div>
            <label>HIC registration number</label>
            <input type="text" name="hic_registration" defaultValue={p?.hic_registration ?? ''} />
          </div>
          <div>
            <label>FEIN</label>
            <input type="text" name="fein" defaultValue={p?.fein} placeholder="00-0000000" />
          </div>
          <div>
            <label>Phone</label>
            <input type="tel" name="phone" defaultValue={p?.phone} />
          </div>
          <div>
            <label>Email</label>
            <input type="email" name="email" defaultValue={p?.email} />
          </div>
          <div>
            <label>Builder license (optional)</label>
            <input type="text" name="license" defaultValue={p?.license} />
          </div>
          <div>
            <label>Builder license expires</label>
            <input type="date" name="license_expires" defaultValue={p?.license_expires} />
          </div>
        </div>
        <AddressFields a={p?.address} />
        <Submit>Save business details</Submit>
      </form>

      <h2>Subcontractors</h2>
      <p className="muted small">Each licensed sub completes and signs their own technical section. Mark one per trade as your usual.</p>
      {subs.map((s) => (
        <details key={s.id} className="panel">
          <summary>
            <strong>{s.name}</strong> · {TRADES[s.trade]} · License {s.license} {s.usual && <span className="tag">Usual</span>} <Expiry date={s.expires} />
          </summary>
          <SubForm sub={s} />
          <form action={deleteSub}>
            <input type="hidden" name="id" value={s.id} />
            <button className="link" type="submit">
              Remove {s.name}
            </button>
          </form>
        </details>
      ))}
      <details className="panel" open={subs.length === 0}>
        <summary>
          <strong>Add a subcontractor</strong>
        </summary>
        <SubForm />
      </details>
    </>
  );
}
