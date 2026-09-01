import { defineConfig } from 'tsup';

import { readFileSync } from 'node:fs';
import { cp } from 'node:fs/promises';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

const outDir = './dist';

export default defineConfig([
  // CLI entries (with shebang)
  {
    entry: ['src/index.ts', 'src/add.ts', 'src/crouton.ts', 'src/create-datasource/index.ts'],
    outDir,
    format: ['esm'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: true,
    banner: {
      js: [
        '#!/usr/bin/env node',
        'import { createRequire as __createRequire } from \'module\';',
        'const require = __createRequire(import.meta.url);',
      ].join('\n'),
    },
    noExternal: ['commander', '@clack/prompts', 'picocolors', '@ghentcdh/crouton-codegen'],
    external: ['@prisma/internals'],
    define: {
      __CROUTON_VERSION__: JSON.stringify(pkg.version),
    },
    esbuildOptions(options) {
      options.conditions = ['@ghentcdh/crouton'];
    },
    async onSuccess() {
      // Copy templates into dist so they're available at runtime
      await cp('./templates', `${outDir}/templates`, { recursive: true }).catch(
        () => {
          /* no templates yet */
        },
      );
    },
  },
  // Library entry (shared utilities — exported as @ghentcdh/create-crouton/lib)
  {
    entry: { 'lib/index': 'src/lib/index.ts' },
    outDir,
    format: ['esm'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: false,
    banner: {
      js: [
        'import { createRequire as __createRequire } from \'module\';',
        'const require = __createRequire(import.meta.url);',
      ].join('\n'),
    },
    noExternal: ['@ghentcdh/crouton-codegen'],
    external: ['@prisma/internals'],
    esbuildOptions(options) {
      options.conditions = ['@ghentcdh/crouton'];
    },
  },
]);
