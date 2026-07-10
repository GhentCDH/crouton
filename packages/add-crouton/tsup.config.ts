import { defineConfig } from 'tsup';

const outDir = './dist';

export default defineConfig({
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
  noExternal: ['commander', '@clack/prompts', 'picocolors', '@ghentcdh/crouton-codegen', '@ghentcdh/crouton-cli', '@ghentcdh/create-crouton'],
  external: ['@prisma/internals'],
  esbuildOptions(options) {
    options.conditions = ['@ghentcdh/crouton'];
  },
});
