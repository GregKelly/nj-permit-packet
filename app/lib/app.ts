// The app's one Store and job service. Server-only: imports SQLite and reads the API key.

import { Store } from '../../src/db';
import { Jobs } from '../../src/jobs/service';
import { projectPath } from '../../src/paths';
import { loadRules } from '../../src/rules-dir';

/** The computer's date, YYYY-MM-DD (the license-expiry check and the packet's prepared date use it). */
export const today = () => new Date().toLocaleDateString('en-CA');

// Kept on globalThis so the dev server's reloads don't open the database again.
const g = globalThis as unknown as { __store?: Store };

export function store(): Store {
  g.__store ??= new Store(projectPath('data', 'permit-packet.db'));
  return g.__store;
}

/** A new service each time (it holds no state), so a reload always runs the current code. */
export function jobs(): Jobs {
  // Rules are read on every step, so an edited rule file applies at once.
  return new Jobs({ store: store(), rules: () => loadRules(), today });
}
