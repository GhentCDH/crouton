// Generate resource.schema.json (JSON Schema) from the Zod definition, for editor
// autocomplete/validation. Runs from tsup's `onSuccess`, so it imports the freshly
// built ESM in ./dist. Writes two copies:
//   - dist/resource.schema.json          → shipped in the npm package (files: ["dist"])
//   - src/lib/resource/resource.schema.json → committed copy, guarded by a CI drift check
//
// Generate from ResourceJsonShape (the z.object), NOT ResourceJsonSchema (which has a
// .transform() that z.toJSONSchema rejects). The input shape is what a file author writes.
import { z } from 'zod';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Imported from the built ESM output (tsup runs before this via onSuccess).
import { CURRENT_RESOURCE_VERSION, ResourceJsonShape } from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, '..');

// `io: 'input'` represents the *input* side of any nested pipe/transform (what a file author
// writes), and `unrepresentable: 'any'` degrades anything still not expressible to `{}` (loose,
// but fine for autocomplete) instead of throwing.
const schema = z.toJSONSchema(ResourceJsonShape, {
  target: 'draft-7',
  io: 'input',
  unrepresentable: 'any',
});
schema.$id = `https://ghentcdh.github.io/crouton/schema/v${CURRENT_RESOURCE_VERSION}/resource.schema.json`;
schema.title = 'Crouton resource.json';
schema.description = `Generated from ResourceJsonShape (crouton-core). Do not edit by hand. schemaVersion ${CURRENT_RESOURCE_VERSION}.`;

const out = `${JSON.stringify(schema, null, 2)}\n`;

// Two names per location:
//   - resource.schema.json           → the "latest" pointer (always the current version)
//   - resource.schema.v<N>.json      → a frozen, per-version snapshot for track-back
// The versioned file is only ever written for the CURRENT version; older v<N> files are
// historical artifacts left untouched by future builds, so each version stays recoverable.
const versionedName = `resource.schema.v${CURRENT_RESOURCE_VERSION}.json`;

const distDir = join(pkgRoot, 'dist');
const committedDir = join(pkgRoot, 'src', 'lib', 'resource');
mkdirSync(distDir, { recursive: true });
mkdirSync(committedDir, { recursive: true });
for (const dir of [distDir, committedDir]) {
  writeFileSync(join(dir, 'resource.schema.json'), out);
  writeFileSync(join(dir, versionedName), out);
}

// Publish to the docs site so it's served at the versioned Pages URL the `$id`/`$schema`
// point to: <base>/schema/v<N>/resource.schema.json. VuePress copies everything under
// `docs/.vuepress/public` to the site root verbatim. Committed + drift-checked like the others.
// Guarded so an isolated package build (no docs dir) still succeeds.
const repoRoot = join(pkgRoot, '..', '..');
const vuepressDir = join(repoRoot, 'docs', '.vuepress');
const inRepoWithDocs = existsSync(vuepressDir);
if (inRepoWithDocs) {
  const schemaDir = join(vuepressDir, 'public', 'schema');
  const versionedDir = join(schemaDir, `v${CURRENT_RESOURCE_VERSION}`);
  mkdirSync(versionedDir, { recursive: true });
  writeFileSync(join(versionedDir, 'resource.schema.json'), out); // canonical, matches $schema URL
  writeFileSync(join(schemaDir, 'resource.schema.json'), out); // /schema/... "latest"
}

console.info(
  `[crouton-core] wrote resource.schema.json + ${versionedName}` +
    (inRepoWithDocs ? ' (+ docs public)' : ''),
);
