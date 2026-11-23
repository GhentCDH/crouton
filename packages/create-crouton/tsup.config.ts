import { defineConfig } from 'tsup';

// eslint-disable-next-line @nx/enforce-module-boundaries -- build-time only: reads repo package.jsons
import { readDepVersions } from '../../tools/template-dep-versions.mjs';
import { readFileSync } from 'node:fs';
import { cp } from 'node:fs/promises';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

const outDir = './dist';

export default defineConfig([
  // CLI entry (with shebang)
  {
    entry: ['src/index.ts'],
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
      __CROUTON_DEP_VERSIONS__: JSON.stringify(readDepVersions('../..')),
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
      // Agent files live in crouton-cli (single source of truth); merge into templates/shared
      await cp('../crouton-cli/agent-files', `${outDir}/templates/shared`, { recursive: true }).catch(
        () => { /* agent-files not built yet */ },
      );
    },
  },
  // Library entry (shared utilities used by add-crouton)
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
