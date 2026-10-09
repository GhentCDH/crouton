/**
 * Copies docs/guide/**\/*.md (excluding _generated/) into
 * packages/crouton-core/agent-docs/ mirroring directory structure,
 * then writes a README.md index.
 */

import { copyFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const srcDir = join(root, 'docs/guide');
const destDir = join(root, 'packages/crouton-core/agent-docs');

const readWhen = (rel) => {
  const name = rel.replace(/\.md$/, '').replace(/^.*\//, '');
  const hints = {
    'index': 'getting an overview of this section',
    'backend': 'setting up or configuring the crouton backend',
    'manual-setup': 'setting up crouton manually without the scaffold',
    'project-structure': 'understanding the folder layout',
    'columns': 'configuring resource columns and field inputs',
    'relations': 'adding or editing resource relations',
    'layout': 'customising resource list/form layout',
    'actions': 'adding custom actions to a resource',
    'hooks': 'using resource lifecycle hooks',
    'operations': 'enabling or restricting CRUD operations',
    'security': 'securing resources with roles/policies',
    'unique': 'enforcing unique constraints on resources',
    'versioning': 'enabling resource versioning',
    'extensions': 'extending resources with plugins',
    'custom-resource': 'creating a config-only (kind: custom) resource',
    'data-sources': 'configuring Prisma or custom data sources',
    'status': 'checking backend status and health',
    'cli': 'using the crouton CLI (update, validate, etc.)',
    'validator': 'understanding crouton validate output',
    'resource-editor': 'using the resource editor UI',
    'croutonform': 'embedding a CroutonForm component',
    'custom-renderers': 'registering custom field renderers',
    'modals-and-relations': 'using modals for relation editing',
    'styling': 'overriding crouton styles',
    'translations': 'adding i18n translations',
    'use-crouton': 'using the useCrouton composable',
    'crouton-json': 'editing or understanding crouton.json',
    'endpoints': 'reference for REST endpoints',
    'enums': 'reference for enum definitions',
    'normalize-schema': 'understanding schema normalisation',
    'packages': 'understanding which packages to install',
    'parse-schema': 'reference for schema parsing utilities',
    'README': 'getting a high-level overview of the docs',
    'array': 'using array field inputs',
    'autocomplete': 'using autocomplete field inputs',
    'boolean': 'using boolean field inputs',
    'common-options': 'understanding options shared by all field inputs',
    'custom': 'creating custom field inputs',
    'date-range': 'using date-range field inputs',
    'date': 'using date field inputs',
    'markdown': 'using markdown field inputs',
    'number': 'using number field inputs',
    'relation': 'using relation field inputs',
    'select': 'using select field inputs',
    'string': 'using string/text field inputs',
    'textarea': 'using textarea field inputs',
    'toggle': 'using toggle field inputs',
  };
  return hints[name] ?? `working with ${name.replace(/-/g, ' ')}`;
};

const collectMd = async (dir, baseDir, acc = []) => {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '_generated') continue;
      await collectMd(full, baseDir, acc);
    } else if (e.name.endsWith('.md')) {
      acc.push(relative(baseDir, full));
    }
  }
  return acc;
};

const files = await collectMd(srcDir, srcDir);

await mkdir(destDir, { recursive: true });

for (const rel of files) {
  const src = join(srcDir, rel);
  const dest = join(destDir, rel);
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(src, dest);
}

const rows = files.map((rel) => `| ${rel} | ${readWhen(rel)} |`).join('\n');
const index = `# Crouton agent docs index

Read this file to find the right doc for your task.

| File | Read when... |
|------|-------------|
${rows}
`;

await writeFile(join(destDir, 'README.md'), index, 'utf-8');

console.log(`agent-docs: wrote ${files.length} docs + README.md`);
