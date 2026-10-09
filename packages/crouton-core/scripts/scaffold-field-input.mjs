#!/usr/bin/env node
/**
 * Usage: node packages/crouton-core/scripts/scaffold-field-input.mjs <type> [--dry-run]
 * Example: node packages/crouton-core/scripts/scaffold-field-input.mjs rating
 *
 * Scaffolds all the boilerplate for a new field input type.
 * Pass --dry-run to print what would be done without writing files.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, '..');
const repoRoot = join(pkgRoot, '..', '..');

const rawType = process.argv[2];
const DRY_RUN = process.argv.includes('--dry-run');

if (!rawType) {
  console.error('Usage: node packages/crouton-core/scripts/scaffold-field-input.mjs <type> [--dry-run]');
  process.exit(1);
}

if (!/^[a-z][a-z0-9_]*$/.test(rawType)) {
  console.error(`Type name must be lowercase letters, digits and underscores only (got "${rawType}").`);
  console.error('Use underscores instead of hyphens, e.g. "date_range" not "date-range".');
  process.exit(1);
}

const type = rawType;
const TypeName = type.charAt(0).toUpperCase() + type.slice(1);

const writeFile = (filePath, content) => {
  if (DRY_RUN) { console.log(`  [dry-run] write: ${filePath}`); return; }
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
  console.log(`  wrote: ${filePath}`);
};

const editFile = (filePath, transform) => {
  if (DRY_RUN) { console.log(`  [dry-run] edit: ${filePath}`); return; }
  const before = readFileSync(filePath, 'utf8');
  const after = transform(before);
  if (after === before) { console.log(`  skipped (already present): ${filePath}`); return; }
  writeFileSync(filePath, after, 'utf8');
  console.log(`  edited: ${filePath}`);
};

console.log(`Scaffolding field input type: ${type}${DRY_RUN ? ' (dry-run)' : ''}`);

// 1. Options schema
writeFile(
  join(pkgRoot, 'src/lib/resource/field-input/types', `${type}.options.ts`),
  `import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';
import { opt } from '../option-meta';

export const ${TypeName}OptionsSchema = BaseOptionsSchema.extend({
  // Add options here. Use opt() wrapper for optional fields with descriptions.
  // Example:
  // label: opt(z.string().optional(), { description: 'Label for the field' }),
}).meta({ title: '${TypeName} options', description: '${TypeName} field input options' });
`,
);

// 2. Registry entry
editFile(
  join(pkgRoot, 'src/lib/resource/field-input/registry.ts'),
  (src) => {
    if (src.includes(`'${type}'`)) return src;
    const withImport = `import { ${TypeName}OptionsSchema } from './types/${type}.options';\n` + src;
    return withImport.replace(
      ']);',
      `  ['${type}',       { options: ${TypeName}OptionsSchema,        schemaFile: '${type}' }],\n]);`,
    );
  },
);

// 3. ControlType entry
editFile(
  join(pkgRoot, 'src/lib/layout/control.builder.ts'),
  (src) => {
    if (src.includes(`  ${type}: '${type}'`)) return src;
    return src.replace('} as const;', `  ${type}: '${type}',\n} as const;`);
  },
);

// 4. Vue renderer stub
writeFile(
  join(repoRoot, 'packages/crouton-forms-vue/src/forms/renderers/controls', `${TypeName}ControlRenderer.vue`),
  `<script setup lang="ts">
// TODO: implement ${TypeName} renderer
// Read the options with: const options = computed(() => props.uischema?.options ?? {});
</script>
<template>
  <div><!-- TODO: implement ${TypeName} control --></div>
</template>
`,
);

// 5. Tester
editFile(
  join(repoRoot, 'packages/crouton-forms-vue/src/testers/tester.ts'),
  (src) => {
    if (src.includes(`is${TypeName}Control`)) return src;
    return src + `\nexport const is${TypeName}Control = and(uiTypeIs('Control'), optionIsIgnoreCase('format', ControlType.${type}));\n`;
  },
);

// 6. Renderer registration in controls/index.ts
editFile(
  join(repoRoot, 'packages/crouton-forms-vue/src/forms/renderers/controls/index.ts'),
  (src) => {
    if (src.includes(`${TypeName}ControlRenderer`)) return src;
    let out = `import ${TypeName}ControlRenderer from './${TypeName}ControlRenderer.vue';\n` + src;
    out = out.replace(
      "} from '../../../testers/tester';",
      `  is${TypeName}Control,\n} from '../../../testers/tester';`,
    );
    out = out.replace('];', `  { tester: rankWith(11, is${TypeName}Control), renderer: ${TypeName}ControlRenderer },\n];`);
    return out;
  },
);

// 7. CANVAS_SUPPORTED_TYPES — insert before the closing ]); of the Set constructor
editFile(
  join(repoRoot, 'packages/crouton-editor-vue/src/canvas/type-swaps.ts'),
  (src) => {
    if (src.includes(`'${type}'`)) return src;
    // Insert new entry before the Set's closing ]); (distinguished by the blank line before the next export)
    return src.replace(
      /\]\);\n\nexport const isCanvasSupportedType/,
      `  '${type}',\n]);\n\nexport const isCanvasSupportedType`,
    );
  },
);

// 8. Docs stub
writeFile(
  join(repoRoot, 'docs/guide/2.resources/field-inputs', `${type}.md`),
  `# ${TypeName} field input

TODO: describe when to use this field input.

<!-- @include: ./_generated/${type}.md -->
`,
);

// 9. Docs index link
editFile(
  join(repoRoot, 'docs/guide/2.resources/field-inputs/index.md'),
  (src) => {
    if (src.includes(`\`${type}\``)) return src;
    return src.replace(
      '\nSee [Common options]',
      `| \`${type}\`       | ${TypeName} control                              | [${type}.field-input.schema.json](https://ghentcdh.github.io/crouton/schema/v1/${type}.field-input.schema.json) |\n\nSee [Common options]`,
    );
  },
);

console.log(`
Scaffolded ${type} field input. Remaining manual steps:
  - Implement the Vue renderer: packages/crouton-forms-vue/src/forms/renderers/controls/${TypeName}ControlRenderer.vue
  - Add Prisma type mapping in packages/crouton-codegen/src/naming.ts:fieldInputType (if applicable)
  - Add form-schema.builder.ts branch if this type needs custom option forwarding
  - Fill in the docs stub: docs/guide/2.resources/field-inputs/${type}.md
  - Run: pnpm nx run crouton-core:build
  - Run: pnpm nx run crouton-core:test
`);
