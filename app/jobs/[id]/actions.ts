'use server';
// The job page's steps: questions, Review (facts editor, Confirm) and Print. Each calls the job service.

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { UNKNOWN } from '../../../src/engine';
import { JobError } from '../../../src/jobs/service';
import type { JobRecord, TeamTrade } from '../../../src/jobs/types';
import { jobs, store } from '../../lib/app';

const text = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

/** Run a step; a JobError comes back to the page as a message instead of a crash. */
async function step(id: number, run: () => unknown, then?: string): Promise<never> {
  try {
    await run();
  } catch (error) {
    if (!(error instanceof JobError)) throw error;
    redirect(`/jobs/${id}?${then ? `step=${then}&` : ''}error=${encodeURIComponent(error.message)}`);
  }
  redirect(`/jobs/${id}${then ? `?step=${then}` : ''}`);
}

/**
 * Questions form: `q:<key>` holds a picked value or a typed number, `dk:<key>` is "Don't know";
 * `name:<trade>` resolves a name from the description (a sub id, "owner", or "new" with `new:<trade>:<field>`).
 * Questions left blank stay open.
 */
export async function answerQuestions(id: number, then: string | undefined, f: FormData) {
  await step(
    id,
    async () => {
      const answers: Record<string, unknown> = {};
      for (const field of f.keys()) {
        if (field.startsWith('dk:')) answers[field.slice(3)] = UNKNOWN;
      }
      for (const [field, value] of f.entries()) {
        if (!field.startsWith('q:')) continue;
        const key = field.slice(2);
        const v = String(value).trim();
        if (!v || key in answers) continue;
        const number = Number(v.replace(/[$,\s]/g, ''));
        answers[key] = f.get(`kind:${key}`) === 'number' ? (Number.isFinite(number) ? number : v) : v;
      }
      for (const [field, value] of f.entries()) {
        if (!field.startsWith('name:') || !String(value)) continue;
        const trade = field.slice(5);
        let choice: number | 'owner';
        if (value === 'owner') choice = 'owner';
        else if (value === 'new') {
          const name = text(f, `new:${trade}:name`);
          const license = text(f, `new:${trade}:license`);
          const expires = text(f, `new:${trade}:expires`);
          if (!name || !license || !/^\d{4}-\d{2}-\d{2}$/.test(expires)) throw new JobError('A new subcontractor needs a name, license number and license expiry date.');
          choice = store().saveSub({ trade: text(f, `new:${trade}:trade`) as TeamTrade, name, license, expires });
        } else choice = Number(value);
        jobs().resolveName(id, trade, choice);
      }
      if (Object.keys(answers).length) await jobs().answer(id, answers);
    },
    then,
  );
}

/** Review screen's facts editor (called from the browser on every change). Returns an error message, or null. */
export async function editJob(id: number, change: Partial<Pick<JobRecord, 'raw' | 'team' | 'home_type'>>): Promise<string | null> {
  try {
    jobs().edit(id, change);
  } catch (error) {
    if (error instanceof JobError) return error.message;
    throw error;
  }
  refresh();
  return null;
}

/** Review screen: the owner and site details. */
export async function editOwnerSite(id: number, f: FormData) {
  await step(
    id,
    () => {
      const v = jobs().view(id);
      const zip = text(f, 'owner_zip');
      jobs().edit(id, {
        owner: {
          name: text(f, 'owner_name'),
          address: { street: text(f, 'owner_street'), city: text(f, 'owner_city'), state: text(f, 'owner_state') || 'NJ', zip },
          ...(text(f, 'owner_phone') ? { phone: text(f, 'owner_phone') } : {}),
          ...(text(f, 'owner_email') ? { email: text(f, 'owner_email') } : {}),
        },
        site: { ...v.job.site, street: text(f, 'street'), zip: text(f, 'zip'), block: text(f, 'block'), lot: text(f, 'lot'), qualifier: text(f, 'qualifier') || undefined },
      });
    },
    'review',
  );
}

export async function setNotCovered(id: number, textOf: string, action: 'remove' | 'restore') {
  await step(id, () => jobs().setNotCovered(id, textOf, action), 'review');
}

export async function confirmJob(id: number) {
  try {
    jobs().confirm(id);
  } catch (error) {
    if (!(error instanceof JobError)) throw error;
    redirect(`/jobs/${id}?step=review&error=${encodeURIComponent(error.message)}`);
  }
  redirect(`/jobs/${id}?step=print`);
}

export async function draftScope(id: number) {
  await step(id, () => jobs().draftScope(id), 'print');
}

/** Approve the narrative as edited (paragraphs separated by blank lines), or the plain list. */
export async function approveScope(id: number, f: FormData) {
  const plain = f.get('plain') === 'yes';
  const paragraphs = text(f, 'narrative').split(/\n\s*\n/);
  await step(id, () => jobs().approveScope(id, plain ? null : paragraphs), 'print');
}

/** Clear an approval to edit the narrative again. */
export async function reopenScope(id: number) {
  await step(id, () => jobs().reopenScope(id), 'print');
}

export async function preparePacket(id: number) {
  await step(id, () => jobs().packet(id), 'print');
}

export async function deleteJob(id: number) {
  jobs().remove(id);
  redirect('/');
}
