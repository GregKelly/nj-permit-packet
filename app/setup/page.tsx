import { connection } from 'next/server';
import Link from 'next/link';
import type { SavedSub } from '../../src/db';
import { PATTERNS } from '../../src/jobs/contact';
import { store, today } from '../lib/app';
import { Submit } from '../ui/submit';
import { deleteSub, saveOwnLicense, saveProfile, saveSub } from './actions';

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
        <input type="text" name="zip" defaultValue={a?.zip} inputMode="numeric" {...PATTERNS.zip} />
      </div>
    </div>
  );
}

function TradeSelect({ value }: { value?: string }) {
  return (
    <select name="trade" defaultValue={value ?? ''} required>
      <option value="" disabled>
        Pick one
      </option>
      {Object.entries(TRADES).map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

/** Your own license for a trade: the trade, number and expiry. Everything else is your business's. */
function OwnLicenseForm({ sub }: { sub?: SavedSub }) {
  return (
    <form action={saveOwnLicense}>
      {sub && <input type="hidden" name="id" value={sub.id} />}
      <div className="grid2">
        <div>
          <label>Trade</label>
          <TradeSelect value={sub?.trade} />
        </div>
        <div>
          <label>License number</label>
          <input type="text" name="license" defaultValue={sub?.license} required />
        </div>
        <div>
          <label>License expires</label>
          <input type="date" name="expires" defaultValue={sub?.expires} required />
        </div>
      </div>
      <label className="inline">
        <input type="checkbox" name="usual" defaultChecked={sub ? sub.usual : true} /> Picked for new jobs (you usually do this trade yourself)
      </label>
      <div>
        <Submit>{sub ? 'Save changes' : 'Add your license'}</Submit>
      </div>
    </form>
  );
}

/** `sub` edits a saved sub; `company` starts a new license with another sub's company details filled in. */
function SubForm({ sub, company }: { sub?: SavedSub; company?: SavedSub }) {
  const from = sub ?? company;
  return (
    <form action={saveSub}>
      {sub && <input type="hidden" name="id" value={sub.id} />}
      <div className="grid2">
        <div>
          <label>Trade</label>
          <TradeSelect value={sub?.trade} />
        </div>
        <div>
          <label>Company name</label>
          <input type="text" name="name" defaultValue={from?.name} required />
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
          <input type="tel" name="phone" defaultValue={from?.phone} placeholder="973-555-0101" {...PATTERNS.phone} />
        </div>
        <div>
          <label>Email</label>
          <input type="email" name="email" defaultValue={from?.email} />
        </div>
        <div>
          <label>FEIN (optional)</label>
          <input type="text" name="fein" defaultValue={from?.fein} placeholder="00-0000000" {...PATTERNS.fein} />
        </div>
      </div>
      <AddressFields a={from?.address} />
      <label className="inline">
        <input type="checkbox" name="usual" defaultChecked={sub?.usual} /> My usual {sub ? TRADES[sub.trade].toLowerCase() : ''} sub (picked for new jobs)
      </label>
      <div>
        <Submit>{sub ? 'Save changes' : company ? 'Add this license' : 'Add subcontractor'}</Submit>
      </div>
    </form>
  );
}

export default async function SetupPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await connection();
  const { ok, error, copy } = await searchParams;
  const p = store().getProfile();
  const all = store().listSubs();
  const own = all.filter((s) => s.self);
  const subs = all.filter((s) => !s.self);
  // A company holding several trade licenses (one per trade, each with its own number) is listed once.
  const companies = Map.groupBy(subs, (s) => s.name.trim().toLowerCase());
  const company = copy ? subs.find((s) => s.id === Number(copy)) : undefined;

  return (
    <>
      <h1>Setup</h1>
      <p className="muted">Entered once, used on every packet. All of this stays on this computer; none of it is sent to the AI.</p>
      {ok && (
        <div className="banner ok">
          {ok}
          {p && all.length > 0 && (
            <>
              {' '}
              <Link href="/jobs/new">Start a job →</Link>
            </>
          )}
        </div>
      )}
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
            <input type="text" name="fein" defaultValue={p?.fein} placeholder="00-0000000" {...PATTERNS.fein} />
          </div>
          <div>
            <label>Phone</label>
            <input type="tel" name="phone" defaultValue={p?.phone} placeholder="973-555-0101" {...PATTERNS.phone} />
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

      {p && (
        <>
          <h2>Your own trade licenses</h2>
          <p className="muted small">
            If your business holds an electrical, plumbing or HVACR license, add it here. Your business can then sign that trade&apos;s section itself, for
            example on an HVAC-only job with no subs. Name, address and phone come from your business details above.
          </p>
          {own.map((s) => (
            <details key={s.id} className="panel">
              <summary>
                <strong>{TRADES[s.trade]}</strong> · License {s.license} {s.usual && <span className="tag">Usual</span>} <Expiry date={s.expires} />
              </summary>
              <OwnLicenseForm sub={s} />
              <form action={deleteSub}>
                <input type="hidden" name="id" value={s.id} />
                <button className="link" type="submit">
                  Remove this license
                </button>
              </form>
            </details>
          ))}
          <details className="panel">
            <summary>
              <strong>Add your own trade license</strong>
            </summary>
            <OwnLicenseForm />
          </details>
        </>
      )}

      <h2>Subcontractors</h2>
      <p className="muted small">
        Each licensed sub completes and signs their own technical section. Mark one per trade as your usual. A company with licenses in several trades gets one
        entry per trade, since each license has its own number and expiry.
      </p>
      {[...companies.values()].map((licenses) => (
        <div key={licenses[0].id} className="panel">
          <strong>{licenses[0].name}</strong>
          {licenses.map((s) => (
            <details key={s.id}>
              <summary>
                {TRADES[s.trade]} · License {s.license} {s.usual && <span className="tag">Usual</span>} <Expiry date={s.expires} />
              </summary>
              <SubForm sub={s} />
              <form action={deleteSub}>
                <input type="hidden" name="id" value={s.id} />
                <button className="link" type="submit">
                  Remove {s.name}&apos;s {TRADES[s.trade].toLowerCase()} license
                </button>
              </form>
            </details>
          ))}
          <Link className="small" href={`/setup?copy=${licenses[0].id}#add-sub`}>
            Add another trade license for {licenses[0].name}
          </Link>
        </div>
      ))}
      <details id="add-sub" className="panel" open={subs.length === 0 || !!company}>
        <summary>
          <strong>{company ? `Add another trade license for ${company.name}` : 'Add a subcontractor'}</strong>
        </summary>
        <SubForm key={company?.id ?? 'new'} company={company} />
      </details>

      {p && (
        <div className="panel">
          <strong>Done with Setup?</strong> You can come back and change any of this later.{' '}
          <Link className="button" href="/jobs/new">
            Start a job
          </Link>
        </div>
      )}
    </>
  );
}
