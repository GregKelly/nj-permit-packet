// The four screens, with where the job is. Links go back to steps already reached.

import Link from 'next/link';

const STEPS = [
  ['describe', '1. Describe'],
  ['questions', '2. Questions'],
  ['review', '3. Review'],
  ['print', '4. Print'],
] as const;
export type Step = (typeof STEPS)[number][0];

export function Steps({ current, reached = current, jobId }: { current: Step; reached?: Step; jobId?: number }) {
  const at = STEPS.findIndex(([s]) => s === reached);
  return (
    <ol className="steps">
      {STEPS.map(([step, label], i) => {
        const cls = step === current ? 'current' : i <= at ? 'done' : '';
        const linkable = jobId !== undefined && step !== 'describe' && step !== current && i <= at;
        return (
          <li key={step} className={cls}>
            {linkable ? <Link href={`/jobs/${jobId}?step=${step}`}>{label}</Link> : label}
          </li>
        );
      })}
    </ol>
  );
}
