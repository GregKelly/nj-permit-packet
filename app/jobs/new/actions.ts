'use server';
// Describe screen: look up the property, then save the job and send the description to the AI.

import { redirect } from 'next/navigation';
import { JobError } from '../../../src/jobs/service';
import type { NewJob } from '../../../src/jobs/types';
import { lookupParcel, type ParcelResult } from '../../../src/parcel/lookup';
import { jobs, store } from '../../lib/app';

export async function findParcels(street: string, town: string): Promise<ParcelResult> {
  return lookupParcel(street, town, { cache: store().parcelCache(() => new Date().toISOString()) });
}

/** Returns an error message to show, or redirects to the new job. */
export async function createJob(input: NewJob): Promise<string> {
  let id: number;
  try {
    id = (await jobs().create(input)).id;
  } catch (error) {
    if (error instanceof JobError) return error.message;
    throw error;
  }
  redirect(`/jobs/${id}`);
}
