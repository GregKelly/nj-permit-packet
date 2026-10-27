// Print screen: the scope narrative (AI draft, edited and approved, or the plain list), then the packet.

import type { JobView } from '../../../src/jobs/service';
import { Submit } from '../../ui/submit';
import { approveScope, draftScope, reopenScope } from './actions';

export function PrintStep({ v }: { v: JobView }) {
  const n = v.job.narrative;
  const ready = !v.needs_scope || n?.approved;
  return (
    <>
      {v.needs_scope && (
        <>
          <h2>Scope of work</h2>
          <div className="panel">
            {n?.approved ? (
              <>
                {n.paragraphs.length ? n.paragraphs.map((p, i) => <p key={i}>{p}</p>) : <p className="muted">Using the plain list of work items.</p>}
                <form action={reopenScope.bind(null, v.id)}>
                  <Submit className="secondary">Edit the scope of work</Submit>
                </form>
              </>
            ) : (
              <>
                {n?.note && <div className="banner warn">{n.note}</div>}
                <p className="muted small">
                  The reviewer reads this first. The AI drafts it from the confirmed facts only; edit it as you like. Separate paragraphs with a blank line.
                </p>
                <form action={draftScope.bind(null, v.id)}>
                  <Submit className="secondary" pending="Drafting…">
                    {n?.paragraphs.length ? 'Draft again' : 'Draft with AI'}
                  </Submit>
                </form>
                <form action={approveScope.bind(null, v.id)}>
                  <textarea name="narrative" aria-label="Scope of work" rows={10} defaultValue={n?.paragraphs.join('\n\n') ?? ''} />
                  <Submit>Approve this scope of work</Submit>
                  <Submit className="secondary" name="plain" value="yes">
                    Use the plain list instead
                  </Submit>
                </form>
              </>
            )}
          </div>
        </>
      )}

      <h2>The packet</h2>
      {ready ? (
        <>
          <a className="button" href={`/jobs/${v.id}/packet?download=1`}>
            Download PDF
          </a>
          <a className="button secondary" href={`/jobs/${v.id}/packet`} target="_blank" rel="noreferrer">
            Open to print
          </a>
          <iframe className="pdf" src={`/jobs/${v.id}/packet`} title="Permit packet" />
        </>
      ) : (
        <p className="muted">Approve the scope of work (or choose the plain list) first.</p>
      )}
    </>
  );
}
