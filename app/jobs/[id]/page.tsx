import Link from 'next/link';
import { connection } from 'next/server';
import { PATTERNS } from '../../../src/jobs/contact';
import { JobError, type JobView } from '../../../src/jobs/service';
import { HOME_TYPE_LABELS } from '../../../src/parcel/units';
import { jobs, store, today } from '../../lib/app';
import { Steps, type Step } from '../../ui/steps';
import { Submit } from '../../ui/submit';
import { confirmJob, deleteJob, editOwnerSite, setNotCovered } from './actions';
import { DeterminationsView } from './determinations';
import { FactsEditor, type SubOption } from './editor';
import { PrintStep } from './print';
import { QuestionsForm } from './questions';

export default async function JobPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await connection();
  const id = Number((await params).id);
  const { step: asked, error } = await searchParams;
  let v: JobView;
  try {
    v = jobs().view(id);
  } catch (e) {
    if (!(e instanceof JobError)) throw e;
    return <div className="banner bad">{e.message} <Link href="/">Back to jobs</Link></div>;
  }

  const printable = v.stage === 'print' || v.stage === 'printed';
  const reached: Step = printable ? 'print' : 'review';
  const fallback: Step = printable ? 'print' : v.stage === 'questions' ? 'questions' : 'review';
  const step: Step = asked === 'questions' || asked === 'review' || (asked === 'print' && printable) ? asked : fallback;
  const subs = store().listSubs();
  const { job } = v;

  return (
    <>
      <h1>
        {job.site.street} <span className="muted">· {job.owner.name}</span>
      </h1>
      <Steps current={step} reached={reached} jobId={id} />
      {error && <div className="banner bad">{error}</div>}
      {v.rules_changed && <div className="banner warn">The rules have changed since you confirmed this job. Review it again and confirm.</div>}
      {job.ai_note && <div className="banner warn">{job.ai_note}</div>}

      {step === 'questions' && <QuestionsStep v={v} subs={subs} />}
      {step === 'review' && <ReviewStep v={v} subs={subs} />}
      {step === 'print' && <PrintStep v={v} />}

      <details className="panel small">
        <summary>About this job</summary>
        <p>
          Started {v.created}, last changed {v.updated}. AI cost so far: ${job.ai_cost.toFixed(3)}.
        </p>
        <p className="muted">The description as typed: {job.description}</p>
        <form action={deleteJob.bind(null, id)}>
          <Submit className="secondary">Delete this job</Submit>
        </form>
      </details>
    </>
  );
}

function QuestionsStep({ v, subs }: { v: JobView; subs: Parameters<typeof QuestionsForm>[0]['subs'] }) {
  if (!v.questions.length && !v.names.length) {
    return (
      <p>
        No questions open. <Link href={`/jobs/${v.id}?step=review`}>Go to Review</Link>
      </p>
    );
  }
  return (
    <>
      <h2>A few questions</h2>
      <p className="muted">The rules need these to decide. Answer what you know.</p>
      <QuestionsForm v={v} subs={subs} />
    </>
  );
}

function ReviewStep({ v, subs }: { v: JobView; subs: Parameters<typeof QuestionsForm>[0]['subs'] }) {
  const { job } = v;
  const options: SubOption[] = subs.map((s) => ({
    id: s.id,
    trade: s.trade,
    name: s.self ? `Your business (${s.name})` : s.name,
    note: s.expires < today() ? `license expired ${s.expires}` : null,
  }));
  return (
    <>
      {job.not_covered.length > 0 && (
        <div className="banner warn">
          <strong>Not covered by this app: call the office.</strong> Describe it as a work item on the left, or remove it from this packet (the cover checklist then lists it
          under &ldquo;Not in this packet&rdquo;).
          <ul>
            {job.not_covered.map((t) => (
              <li key={t}>
                {t}{' '}
                <form action={setNotCovered.bind(null, v.id, t, 'remove')} style={{ display: 'inline' }}>
                  <Submit className="link">Remove from this packet</Submit>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
      {job.removed.length > 0 && (
        <p className="small muted">
          Listed as not in this packet:{' '}
          {job.removed.map((t) => (
            <span key={t}>
              &ldquo;{t}&rdquo;{' '}
              <form action={setNotCovered.bind(null, v.id, t, 'restore')} style={{ display: 'inline' }}>
                <Submit className="link">Put back</Submit>
              </form>{' '}
            </span>
          ))}
        </p>
      )}

      <div className="cols">
        <div>
          <FactsEditor jobId={v.id} initial={{ raw: job.raw, team: job.team, home_type: job.home_type }} subs={options} />
          <OwnerSite v={v} />
        </div>
        <div>
          {(v.questions.length > 0 || v.names.length > 0) && (
            <>
              <h2>Questions</h2>
              <QuestionsForm v={v} subs={subs} then="review" />
            </>
          )}
          {v.home_type_note && <div className="banner warn">{v.home_type_note}</div>}
          <DeterminationsView d={v.d} />
          <div className="panel">
            {v.blockers.length ? (
              <>
                <strong>Before you can confirm:</strong>
                <ul>
                  {v.blockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </>
            ) : v.stage === 'review' ? (
              <form action={confirmJob.bind(null, v.id)}>
                <p>Confirm that the facts on the left are right. Nothing goes into the packet before you do.</p>
                <Submit>Confirm</Submit>
              </form>
            ) : (
              <p>
                Confirmed {job.confirmed?.date}. <Link href={`/jobs/${v.id}?step=print`}>Go to Print</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function OwnerSite({ v }: { v: JobView }) {
  const { site, owner } = v.job;
  const a = owner.address;
  const field = (name: string, label: string, value?: string, check?: { pattern: string; title: string }) => (
    <div>
      <label htmlFor={name}>{label}</label>
      <input id={name} type="text" name={name} defaultValue={value ?? ''} {...check} />
    </div>
  );
  return (
    <details className="panel">
      <summary>
        <strong>Site and owner</strong> · Block {site.block}, lot {site.lot}
        {site.qualifier ? `, qual. ${site.qualifier}` : ''} · {HOME_TYPE_LABELS[v.job.home_type]}
        {site.year_built ? ` · built ${site.year_built}` : ''}
      </summary>
      <form action={editOwnerSite.bind(null, v.id)}>
        <div className="grid2">
          {field('street', 'Work-site street', site.street)}
          {field('zip', 'Work-site ZIP', site.zip, PATTERNS.zip)}
          {field('block', 'Block', site.block)}
          {field('lot', 'Lot', site.lot)}
          {field('qualifier', 'Qualifier', site.qualifier)}
          {field('owner_name', 'Owner name', owner.name)}
          {field('owner_phone', 'Owner phone', owner.phone, PATTERNS.phone)}
          {field('owner_email', 'Owner email', owner.email)}
          {field('owner_street', 'Owner mailing street', a?.street)}
          {field('owner_city', 'City', a?.city)}
          {field('owner_state', 'State', a?.state)}
          {field('owner_zip', 'ZIP', a?.zip, PATTERNS.zip)}
        </div>
        <Submit className="secondary">Save site and owner</Submit>
      </form>
    </details>
  );
}
