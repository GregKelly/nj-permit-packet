// The open questions, in the AI's wording, with "Don't know" on every one; and names from the
// description that match no subcontractor. Used on the Questions screen and inline on Review.

import type { SavedSub } from '../../../src/db';
import type { JobView } from '../../../src/jobs/service';
import { TRADE_LABELS } from '../../lib/labels';
import { Submit } from '../../ui/submit';
import { answerQuestions } from './actions';

const DIRECTORY_TRADE: Record<string, SavedSub['trade']> = { electrical: 'electrical', plumbing: 'plumbing', mechanical: 'hvacr' };

export function QuestionsForm({ v, subs, then }: { v: JobView; subs: SavedSub[]; then?: string }) {
  return (
    <form action={answerQuestions.bind(null, v.id, then)} className="panel">
      {v.questions.map((q) => (
        <div key={q.key} className="question">
          <div>
            <strong>{q.text}</strong>
          </div>
          {q.options.length ? (
            q.options.map((o) => (
              <label key={o.value} className="inline">
                <input type="radio" name={`q:${q.key}`} value={o.value} /> {o.label}
              </label>
            ))
          ) : (
            <div className="grid2">
              <div>
                <input type="hidden" name={`kind:${q.key}`} value="number" />
                <input type="text" inputMode="decimal" name={`q:${q.key}`} aria-label={q.text} placeholder={q.key.startsWith('costs.') ? '$' : 'Number'} />
              </div>
              <label className="inline">
                <input type="checkbox" name={`dk:${q.key}`} /> Don&apos;t know
              </label>
            </div>
          )}
        </div>
      ))}
      {v.names.map((n) => {
        const trade = DIRECTORY_TRADE[n.trade];
        return (
          <div key={n.trade} className="question">
            <div>
              <strong>
                The description names &ldquo;{n.name}&rdquo; for the {TRADE_LABELS[n.trade].toLowerCase()} work, and that doesn&apos;t match anyone in your subcontractors. Who does
                it?
              </strong>
            </div>
            <select name={`name:${n.trade}`} defaultValue="" aria-label={`Who does the ${n.trade} work`}>
              <option value="">Pick one…</option>
              {subs
                .filter((s) => s.trade === trade)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              <option value="new">A new subcontractor (enter below)</option>
              <option value="owner">The owner is doing it</option>
            </select>
            <input type="hidden" name={`new:${n.trade}:trade`} value={trade} />
            <div className="grid2">
              <div>
                <label>New sub: company name</label>
                <input type="text" name={`new:${n.trade}:name`} defaultValue={n.name} />
              </div>
              <div>
                <label>License number</label>
                <input type="text" name={`new:${n.trade}:license`} />
              </div>
              <div>
                <label>License expires</label>
                <input type="date" name={`new:${n.trade}:expires`} />
              </div>
            </div>
          </div>
        );
      })}
      <p className="muted small">&ldquo;Don&apos;t know&rdquo; is fine: the rules then take the stricter case, and the question isn&apos;t asked again.</p>
      <Submit pending="Checking the answers…">Next</Submit>
    </form>
  );
}
