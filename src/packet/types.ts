// Inputs to the packet builder beyond the engine's facts: who's who and where.

import type { JobFacts } from '../engine';

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface Party {
  name: string;
  address?: Address;
  phone?: string;
  email?: string;
}

/** The contractor using the app: the applicant, and the owner's agent on F100. */
export interface Contractor extends Party {
  hic_registration: string | null;
  fein?: string;
  /** Builder registration or other license, if the contractor holds one. */
  license?: string;
  license_expires?: string;
}

/** An entry in the subcontractor directory. */
export interface Subcontractor extends Party {
  trade: 'electrical' | 'plumbing' | 'hvacr';
  license: string;
  expires: string;
  fein?: string;
}

export interface PacketProfile {
  applicant: Contractor;
  /** The directory; the job's facts say which sub does each trade (matched by license number). */
  subcontractors: Subcontractor[];
}

export interface PacketJob {
  /** A short name for the job, printed on our pages (e.g. "J-01" or the owner's name). */
  ref: string;
  facts: JobFacts;
  /** From the parcel lookup, contractor-confirmed. */
  site: { block: string; lot: string; qualifier?: string; zip: string };
  /** Owner details are entered by the contractor (the parcel data redacts names). */
  owner: Party;
  /** The AI-written scope narrative as the contractor approved it (M3), one string per paragraph. */
  scope_narrative?: string[];
}

export type PacketResult =
  | { kind: 'packet' | 'no_permit'; pdf: Uint8Array; pages: PacketPart[] }
  | { kind: 'none'; reason: string };

/** One section of the printed PDF, in print order. */
export interface PacketPart {
  part: 'cover' | 'form' | 'owner_authorization' | 'scope' | 'no_permit';
  form?: string;
  /** First page (1-based) and page count within the packet. */
  start: number;
  pages: number;
}
