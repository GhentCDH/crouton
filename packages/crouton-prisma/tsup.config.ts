import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/generator.ts'],
  outDir: '../../dist/crouton-prisma',
  format: ['esm'],
  dts: false,
  splitting: false,
  sourcemap: false,
  clean: true,
  // Bundle workspace-private deps; keep prisma/generator-helper external (consumer provides it)
  noExternal: ['@ghentcdh/crouton-codegen', '@ghentcdh/crouton-core'],
  external: ['@prisma/generator-helper', '@prisma/internals', 'node:*'],
  banner: { js: '#!/usr/bin/env node' },
});
