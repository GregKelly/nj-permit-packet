// Saved data: the contractor's profile, the subcontractor directory, jobs and the
// parcel cache, in one local SQLite file (data/permit-packet.db, never committed).
// Node's built-in SQLite and plain SQL (M4 plan, decision 9). Records are kept as
// JSON in a column; the few fields screens list or filter by get their own columns.

import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Contractor, PacketProfile, Subcontractor } from '../packet/types';
import type { DirectoryEntry } from '../ai/extract';
import type { ParcelCache } from '../parcel/lookup';

const SCHEMA = `
create table if not exists profile (id integer primary key check (id = 1), data text not null);
create table if not exists subcontractors (
  id integer primary key,
  trade text not null,
  usual integer not null default 0,
  data text not null
);
create table if not exists jobs (
  id integer primary key,
  created text not null,
  updated text not null,
  data text not null
);
create table if not exists packets (job_id integer primary key references jobs (id) on delete cascade, printed text not null, pdf blob not null);
create table if not exists parcel_cache (url text primary key, fetched text not null, body text not null);
`;

/**
 * A directory entry as saved: the packet's Subcontractor plus an id and whether it's the usual one for its trade.
 * `self` marks one of the contractor's own trade licenses: only the trade, license and expiry are saved, and the
 * name, address, phone, email and FEIN are always the profile's, so the business signs that trade's section.
 */
export interface SavedSub extends Subcontractor {
  id: number;
  usual: boolean;
  self?: boolean;
}

export class Store {
  readonly db: DatabaseSync;

  /** `path` is a file, or ':memory:' for tests. */
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('pragma journal_mode = wal; pragma foreign_keys = on;');
    this.db.exec(SCHEMA);
  }

  // ── Profile ──────────────────────────────────────────────────────────────

  getProfile(): Contractor | null {
    const row = this.db.prepare('select data from profile where id = 1').get() as { data: string } | undefined;
    return row ? JSON.parse(row.data) : null;
  }

  saveProfile(profile: Contractor): void {
    this.db.prepare('insert into profile (id, data) values (1, ?) on conflict (id) do update set data = excluded.data').run(JSON.stringify(profile));
  }

  // ── Subcontractor directory ─────────────────────────────────────────────

  listSubs(): SavedSub[] {
    const rows = this.db.prepare('select id, usual, data from subcontractors order by trade, id').all() as { id: number; usual: number; data: string }[];
    const p = this.getProfile();
    return rows.map((r) => {
      const data = JSON.parse(r.data);
      const business = data.self ? { name: p?.name ?? 'Your business', address: p?.address, phone: p?.phone, email: p?.email, fein: p?.fein } : {};
      return JSON.parse(JSON.stringify({ ...data, ...business, id: r.id, usual: r.usual === 1 })); // drops undefined fields
    });
  }

  getSub(id: number): SavedSub | null {
    return this.listSubs().find((s) => s.id === id) ?? null;
  }

  /** Add (no id) or update a sub. Marking one usual unmarks the others of its trade. Returns its id. */
  saveSub(sub: (Subcontractor & { id?: number; usual?: boolean; self?: false }) | (Pick<Subcontractor, 'trade' | 'license' | 'expires'> & { id?: number; usual?: boolean; self: true })): number {
    const { id, usual = false, ...data } = sub;
    const json = JSON.stringify(data.self ? { trade: data.trade, license: data.license, expires: data.expires, self: true } : data);
    let saved: number;
    if (id === undefined) {
      saved = Number(this.db.prepare('insert into subcontractors (trade, usual, data) values (?, ?, ?)').run(data.trade, usual ? 1 : 0, json).lastInsertRowid);
    } else {
      this.db.prepare('update subcontractors set trade = ?, usual = ?, data = ? where id = ?').run(data.trade, usual ? 1 : 0, json, id);
      saved = id;
    }
    if (usual) this.db.prepare('update subcontractors set usual = 0 where trade = ? and id != ?').run(data.trade, saved);
    return saved;
  }

  deleteSub(id: number): void {
    this.db.prepare('delete from subcontractors where id = ?').run(id);
  }

  /** The profile and directory in the packet builder's shape. */
  packetProfile(): PacketProfile {
    const applicant = this.getProfile();
    if (!applicant) throw new Error('Set up your business details first.');
    return { applicant, subcontractors: this.listSubs().map(({ id: _id, usual: _usual, self: _self, ...s }) => s) };
  }

  /** The directory as name matching needs it (keys are sub ids). */
  directory(): DirectoryEntry[] {
    return this.listSubs().map((s) => ({ key: String(s.id), name: s.name, trade: s.trade }));
  }

  // ── Jobs ─────────────────────────────────────────────────────────────────

  insertJob<T>(job: T, now: string): number {
    return Number(this.db.prepare('insert into jobs (created, updated, data) values (?, ?, ?)').run(now, now, JSON.stringify(job)).lastInsertRowid);
  }

  updateJob<T>(id: number, job: T, now: string): void {
    const r = this.db.prepare('update jobs set updated = ?, data = ? where id = ?').run(now, JSON.stringify(job), id);
    if (r.changes !== 1) throw new Error(`No job ${id}`);
  }

  getJob<T>(id: number): { id: number; created: string; updated: string; job: T } | null {
    const row = this.db.prepare('select id, created, updated, data from jobs where id = ?').get(id) as
      | { id: number; created: string; updated: string; data: string }
      | undefined;
    return row ? { id: row.id, created: row.created, updated: row.updated, job: JSON.parse(row.data) } : null;
  }

  listJobs<T>(): { id: number; created: string; updated: string; job: T }[] {
    const rows = this.db.prepare('select id, created, updated, data from jobs order by updated desc, id desc').all() as {
      id: number;
      created: string;
      updated: string;
      data: string;
    }[];
    return rows.map((r) => ({ id: r.id, created: r.created, updated: r.updated, job: JSON.parse(r.data) }));
  }

  deleteJob(id: number): void {
    this.db.prepare('delete from jobs where id = ?').run(id);
  }

  // ── Printed packets (kept so a reprint is the same PDF, even after the rules change) ──

  savePacket(jobId: number, pdf: Uint8Array, printed: string): void {
    this.db
      .prepare('insert into packets (job_id, printed, pdf) values (?, ?, ?) on conflict (job_id) do update set printed = excluded.printed, pdf = excluded.pdf')
      .run(jobId, printed, pdf);
  }

  getPacket(jobId: number): Uint8Array | null {
    const row = this.db.prepare('select pdf from packets where job_id = ?').get(jobId) as { pdf: Uint8Array } | undefined;
    return row ? new Uint8Array(row.pdf) : null;
  }

  // ── Parcel cache ─────────────────────────────────────────────────────────

  parcelCache(now: () => string): ParcelCache {
    return {
      get: (url) => {
        const row = this.db.prepare('select body from parcel_cache where url = ?').get(url) as { body: string } | undefined;
        return row ? JSON.parse(row.body) : undefined;
      },
      set: (url, body) => {
        this.db
          .prepare('insert into parcel_cache (url, fetched, body) values (?, ?, ?) on conflict (url) do update set fetched = excluded.fetched, body = excluded.body')
          .run(url, now(), JSON.stringify(body));
      },
    };
  }
}
