// Where the project's data folders are: found from the project root, the folder
// npm scripts, tests and the app all run from. A module can't look next to
// itself instead, because Next.js moves the server code into .next/ when it bundles it.

import { join } from 'node:path';

export const projectPath = (...parts: string[]) => join(process.cwd(), ...parts);
