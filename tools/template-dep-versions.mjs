// Dependency versions for create-crouton templates, derived from crouton's own
// package.jsons so a scaffolded project uses what crouton builds and tests against.
// Precedence (first wins): example consumer apps > workspace root.
// Used at build time (tsup `define`) and by the template drift spec.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCES = [
  'examples/book-collection/apps/backend/package.json',
  'examples/book-collection/apps/frontend/package.json',
  'package.json',
];

export const readDepVersions = (repoRoot) => {
  const versions = {};
  for (const file of SOURCES) {
    const pkg = JSON.parse(readFileSync(join(repoRoot, file), 'utf8'));
    for (const [name, range] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
      if (name in versions || /^(workspace|link|file):/.test(range)) continue;
      versions[name] = range;
    }
  }
  const pm = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')).packageManager;
  versions.pnpm = pm.replace(/^pnpm@/, '').replace(/\+.*$/, '');
  return versions;
};
