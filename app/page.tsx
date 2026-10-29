import Link from 'next/link';
import { connection } from 'next/server';
import { jobs, store } from './lib/app';

const STAGES = { questions: 'Questions open', review: 'To review', print: 'Ready to print', printed: 'Printed', error: 'Needs attention' } as const;

export default async function HomePage() {
  await connection();
  if (!store().getProfile()) {
    return (
      <>
        <h1>Welcome</h1>
        <div className="banner info">
          First, enter your business details and subcontractors once. They fill the applicant and subcontractor boxes on every packet. <Link href="/setup">Go to Setup</Link>
        </div>
      </>
    );
  }
  const list = jobs().list();
  return (
    <>
      <h1>Jobs</h1>
      <Link href="/jobs/new" className="button">
        New job
      </Link>
      {list.length === 0 ? (
        <p className="muted">No jobs yet.</p>
      ) : (
        <table className="panel">
          <thead>
            <tr>
              <th>Work site</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Last changed</th>
            </tr>
          </thead>
          <tbody>
            {list.map((j) => (
              <tr key={j.id}>
                <td>
                  <Link href={`/jobs/${j.id}`}>{j.street}</Link>
                </td>
                <td>{j.owner}</td>
                <td>{STAGES[j.stage]}</td>
                <td>{j.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
