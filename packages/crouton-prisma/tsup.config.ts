import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/generator.ts'],
  outDir: './dist',
  format: ['esm'],
  dts: false,
  splitting: false,
  sourcemap: false,
  clean: true,
  // Bundle workspace-private deps; keep prisma/generator-helper external (consumer provides it)
  noExternal: ['@ghentcdh/crouton-codegen', '@ghentcdh/crouton-core'],
  external: ['@prisma/generator-helper', '@prisma/internals', 'node:*'],
  banner: { js: '#!/usr/bin/env node' },
  esbuildOptions(options) {
    // Resolve workspace packages via their TS source (same condition crouton-codegen uses)
    options.conditions = ['@ghentcdh/crouton'];
  },
});
