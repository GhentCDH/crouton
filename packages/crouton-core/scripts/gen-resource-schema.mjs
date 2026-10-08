// Generate resource.schema.json (JSON Schema) from the Zod definition, for editor
// autocomplete/validation. Runs from tsup's `onSuccess`, so it imports the freshly
// built ESM in ./dist. Writes two copies:
//   - dist/resource.schema.json          → shipped in the npm package (files: ["dist"])
//   - src/lib/resource/resource.schema.json → committed copy, guarded by a CI drift check
//
// Generate from ResourceJsonShape (the z.object), NOT ResourceJsonSchema (which has a
// .transform() that z.toJSONSchema rejects). The input shape is what a file author writes.

// ponytail: strict refineByKind not in schema; crouton validate --strict covers it

import { z } from 'zod';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Imported from the built ESM output (tsup runs before this via onSuccess).
import {
  CURRENT_RESOURCE_VERSION,
  ResourceJsonShape,
  CroutonConfigSchema,
  DataSourceShape,
  fieldInputRegistry,
} from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, '..');

const RESOURCE_DOCS = 'https://ghentcdh.github.io/crouton/guide/2.resources/resource-json';
const FIELD_INPUT_DOCS_BASE = 'https://ghentcdh.github.io/crouton/guide/2.resources/field-inputs';
const CROUTON_CONFIG_DOCS = 'https://ghentcdh.github.io/crouton/guide/1.setup/crouton-json';
const DATASOURCE_DOCS = 'https://ghentcdh.github.io/crouton/guide/1.setup/data-sources';

/**
 * Walk a JSON Schema object and add `markdownDescription` to every property
 * that has a `description`. Mutates in place and returns the object.
 */
const addMarkdownDescriptions = (schema, docsUrl) => {
  if (!schema || typeof schema !== 'object') return schema;

  if (typeof schema.description === 'string' && !schema.markdownDescription) {
    schema.markdownDescription = `${schema.description}\n\n[Docs](${docsUrl})`;
  }

  for (const value of Object.values(schema)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      addMarkdownDescriptions(value, docsUrl);
    }
  }

  return schema;
};

// Book example for the resource root
const RESOURCE_EXAMPLE = {
  $schema: `https://ghentcdh.github.io/crouton/schema/v${CURRENT_RESOURCE_VERSION}/resource.schema.json`,
  name: 'book',
  model: 'Book',
  title: 'Books',
  columns: {
    id: { idField: true, hiddenInForm: true },
    title: { searchable: true, filterable: true, sortable: true },
    publishedYear: { type: 'integer', sortable: true },
    authorId: {
      label: 'Author',
      searchable: true,
      fieldInput: { type: 'autocomplete', relationType: 'manyToOne', resource: './author.resource' },
    },
    categories: {
      label: 'Categories',
      fieldInput: { format: 'relation', relationType: 'manyToMany', resource: './category.resource' },
      hiddenInTable: true,
    },
  },
  include: ['author', 'categories'],
};

const COLUMN_EXAMPLE = {
  title: { searchable: true, filterable: true, sortable: true, label: 'Title' },
};

const RELATION_EXAMPLE = {
  authorId: {
    label: 'Author',
    fieldInput: { type: 'autocomplete', relationType: 'manyToOne', resource: './author.resource' },
  },
};

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
schema.$comment = 'Use "crouton validate" for strict validation including refineByKind checks.';
schema.examples = [RESOURCE_EXAMPLE];

// Attach examples to nested definitions if they appear in $defs
if (schema.$defs) {
  for (const [key, def] of Object.entries(schema.$defs)) {
    if (!def || typeof def !== 'object') continue;
    const lc = key.toLowerCase();
    if (lc.includes('column') && !def.examples) def.examples = [COLUMN_EXAMPLE];
    if ((lc.includes('relation') || lc.includes('fieldinput')) && !def.examples) {
      def.examples = [RELATION_EXAMPLE];
    }
  }
}

addMarkdownDescriptions(schema, RESOURCE_DOCS);

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

// Per-type field-input option schemas
const emittedSchemaFiles = new Set();
for (const [_type, def] of fieldInputRegistry) {
  if (emittedSchemaFiles.has(def.schemaFile)) continue;
  emittedSchemaFiles.add(def.schemaFile);

  let typeSchema;
  try {
    typeSchema = z.toJSONSchema(def.options, {
      target: 'draft-7',
      io: 'input',
      unrepresentable: 'any',
    });
  } catch {
    typeSchema = {};
  }
  typeSchema.$id = `https://ghentcdh.github.io/crouton/schema/v${CURRENT_RESOURCE_VERSION}/${def.schemaFile}.field-input.schema.json`;
  typeSchema.title = `Crouton fieldInput options: ${def.schemaFile}`;

  const fieldInputDocsUrl = `${FIELD_INPUT_DOCS_BASE}/${def.schemaFile}`;
  addMarkdownDescriptions(typeSchema, fieldInputDocsUrl);

  const typeOut = `${JSON.stringify(typeSchema, null, 2)}\n`;
  const fileName = `${def.schemaFile}.field-input.schema.json`;
  const versionedFileName = `${def.schemaFile}.field-input.schema.v${CURRENT_RESOURCE_VERSION}.json`;

  const fieldInputDistDir = join(distDir, 'field-input-schemas');
  const fieldInputSrcDir = join(committedDir, 'field-input-schemas');
  mkdirSync(fieldInputDistDir, { recursive: true });
  mkdirSync(fieldInputSrcDir, { recursive: true });
  for (const dir of [fieldInputDistDir, fieldInputSrcDir]) {
    writeFileSync(join(dir, fileName), typeOut);
    writeFileSync(join(dir, versionedFileName), typeOut);
  }

  if (inRepoWithDocs) {
    const schemaDir = join(vuepressDir, 'public', 'schema');
    const versionedDir = join(schemaDir, `v${CURRENT_RESOURCE_VERSION}`);
    mkdirSync(versionedDir, { recursive: true });
    writeFileSync(join(versionedDir, fileName), typeOut);
  }
}

console.info(`[crouton-core] wrote ${emittedSchemaFiles.size} field-input schema files`);

// ── crouton.schema.json ──────────────────────────────────────────────────────

const croutonSchema = z.toJSONSchema(CroutonConfigSchema, {
  target: 'draft-7',
  io: 'input',
  unrepresentable: 'any',
});
croutonSchema.$id = `https://ghentcdh.github.io/crouton/schema/v${CURRENT_RESOURCE_VERSION}/crouton.schema.json`;
croutonSchema.title = 'Crouton crouton.json';
croutonSchema.description = 'Generated from CroutonConfigSchema (crouton-core). Do not edit by hand.';
croutonSchema.$comment = 'Use "crouton validate" for strict validation of all referenced resources.';
croutonSchema.examples = [
  {
    $schema: `https://ghentcdh.github.io/crouton/schema/v${CURRENT_RESOURCE_VERSION}/crouton.schema.json`,
    title: 'My App',
    resourcesDir: 'src/resources',
    dataSourcesDir: 'src/data-sources',
  },
];

addMarkdownDescriptions(croutonSchema, CROUTON_CONFIG_DOCS);

const croutonSchemaOut = `${JSON.stringify(croutonSchema, null, 2)}\n`;
const croutonConfigDir = join(pkgRoot, 'src', 'lib', 'config');
mkdirSync(croutonConfigDir, { recursive: true });
writeFileSync(join(distDir, 'crouton.schema.json'), croutonSchemaOut);
writeFileSync(join(croutonConfigDir, 'crouton.schema.json'), croutonSchemaOut);

if (inRepoWithDocs) {
  const schemaDir = join(vuepressDir, 'public', 'schema');
  const versionedDir = join(schemaDir, `v${CURRENT_RESOURCE_VERSION}`);
  mkdirSync(versionedDir, { recursive: true });
  writeFileSync(join(versionedDir, 'crouton.schema.json'), croutonSchemaOut);
  writeFileSync(join(schemaDir, 'crouton.schema.json'), croutonSchemaOut);
}

console.info('[crouton-core] wrote crouton.schema.json');

// ── datasource.schema.json ───────────────────────────────────────────────────

const datasourceSchema = z.toJSONSchema(DataSourceShape, {
  target: 'draft-7',
  io: 'input',
  unrepresentable: 'any',
});
datasourceSchema.$id = `https://ghentcdh.github.io/crouton/schema/v${CURRENT_RESOURCE_VERSION}/datasource.schema.json`;
datasourceSchema.title = 'Crouton data-source.json';
datasourceSchema.description = 'Generated from DataSourceShape (crouton-core). Do not edit by hand.';
datasourceSchema.examples = [
  {
    name: 'default',
    type: 'postgres',
    urlEnv: 'DATABASE_URL',
    default: true,
    adapter: 'prisma',
  },
];

addMarkdownDescriptions(datasourceSchema, DATASOURCE_DOCS);

const datasourceSchemaOut = `${JSON.stringify(datasourceSchema, null, 2)}\n`;
const datasourceDir = join(pkgRoot, 'src', 'lib', 'data-source');
mkdirSync(datasourceDir, { recursive: true });
writeFileSync(join(distDir, 'datasource.schema.json'), datasourceSchemaOut);
writeFileSync(join(datasourceDir, 'datasource.schema.json'), datasourceSchemaOut);

if (inRepoWithDocs) {
  const schemaDir = join(vuepressDir, 'public', 'schema');
  const versionedDir = join(schemaDir, `v${CURRENT_RESOURCE_VERSION}`);
  mkdirSync(versionedDir, { recursive: true });
  writeFileSync(join(versionedDir, 'datasource.schema.json'), datasourceSchemaOut);
  writeFileSync(join(schemaDir, 'datasource.schema.json'), datasourceSchemaOut);
}

console.info('[crouton-core] wrote datasource.schema.json');
