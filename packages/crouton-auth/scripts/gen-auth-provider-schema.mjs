// Generate auth-provider.schema.json (JSON Schema) from the Zod definition, for editor
// autocomplete/validation. Runs from tsup's `onSuccess`, importing the freshly built ESM
// in ./dist. Writes:
//   - dist/auth-provider.schema.json                       → shipped in the npm package (files: ["dist"])
//   - src/lib/auth-provider.schema.json                    → committed copy
//   - docs/.vuepress/public/schema/auth-provider.schema.json → served on the docs site

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

// Imported from the built ESM output (tsup runs before this via onSuccess).
import { AuthProviderSchema } from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, '..');

const SCHEMA_URL = 'https://ghentcdh.github.io/crouton/schema/auth-provider.schema.json';

const schema = z.toJSONSchema(AuthProviderSchema, {
  target: 'draft-7',
  io: 'input',
  unrepresentable: 'any',
});
schema.$id = SCHEMA_URL;
schema.title = 'Crouton auth-provider.json';
schema.description = 'Generated from AuthProviderSchema (@ghentcdh/crouton-auth). Do not edit by hand.';
schema.examples = [
  {
    $schema: SCHEMA_URL,
    name: 'keycloak',
    provider: 'keycloak',
    default: true,
    guards: {
      admin: ['admin'],
      editor: { anyOf: ['editor', 'admin'] },
      publisher: { allOf: ['editor', 'reviewer'] },
    },
    defaultSecurity: { guard: 'authenticated' },
  },
];

const out = `${JSON.stringify(schema, null, 2)}\n`;

const distDir = join(pkgRoot, 'dist');
const committedDir = join(pkgRoot, 'src', 'lib');
mkdirSync(distDir, { recursive: true });
mkdirSync(committedDir, { recursive: true });
writeFileSync(join(distDir, 'auth-provider.schema.json'), out);
writeFileSync(join(committedDir, 'auth-provider.schema.json'), out);

// Publish to the docs site so `$schema` URLs resolve. Guarded so an isolated package
// build (no docs dir) still succeeds.
const repoRoot = join(pkgRoot, '..', '..');
const vuepressDir = join(repoRoot, 'docs', '.vuepress');
const inRepoWithDocs = existsSync(vuepressDir);
if (inRepoWithDocs) {
  const schemaDir = join(vuepressDir, 'public', 'schema');
  mkdirSync(schemaDir, { recursive: true });
  writeFileSync(join(schemaDir, 'auth-provider.schema.json'), out);
}

console.info(`[crouton-auth] wrote auth-provider.schema.json${inRepoWithDocs ? ' (+ docs public)' : ''}`);
