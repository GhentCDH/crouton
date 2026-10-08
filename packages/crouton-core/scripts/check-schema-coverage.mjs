// Verify that every property in the generated resource.schema.json has a description.
// Exits non-zero when coverage < 100%.
// Run via: node packages/crouton-core/scripts/check-schema-coverage.mjs

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, '..');

const schemaPath = join(pkgRoot, 'src', 'lib', 'resource', 'resource.schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

const missing = [];

const walk = (node, path) => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((item, i) => walk(item, `${path}[${i}]`));
    return;
  }

  // A schema node with 'properties' is an object type — check each property
  if (node.properties) {
    for (const [key, propSchema] of Object.entries(node.properties)) {
      const propPath = `${path}.${key}`;
      if (!propSchema.description && !propSchema.$ref) {
        missing.push(propPath);
      }
      walk(propSchema, propPath);
    }
  }

  // Walk $defs
  if (node.$defs) {
    for (const [key, defSchema] of Object.entries(node.$defs)) {
      walk(defSchema, `$defs.${key}`);
    }
  }

  // Walk items (arrays)
  if (node.items) walk(node.items, `${path}.items`);

  // Walk anyOf/oneOf/allOf
  for (const key of ['anyOf', 'oneOf', 'allOf']) {
    if (node[key]) node[key].forEach((s, i) => walk(s, `${path}.${key}[${i}]`));
  }
};

walk(schema, 'resource');

if (missing.length > 0) {
  console.error(`[schema-coverage] ${missing.length} propert${missing.length === 1 ? 'y' : 'ies'} missing description:`);
  for (const p of missing) console.error(`  - ${p}`);
  process.exit(1);
} else {
  const count = [];
  const countProps = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.properties) {
      for (const v of Object.values(node.properties)) { count.push(1); countProps(v); }
    }
    if (node.$defs) for (const v of Object.values(node.$defs)) countProps(v);
    if (node.items) countProps(node.items);
    for (const key of ['anyOf', 'oneOf', 'allOf']) {
      if (node[key]) node[key].forEach(countProps);
    }
  };
  countProps(schema);
  console.info(`[schema-coverage] ✓ All ${count.length} properties have descriptions.`);
}
