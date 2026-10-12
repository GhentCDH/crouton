import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: './dist',
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['zod', '@jsonforms/core', '@ghentcdh/crouton-core'],
  esbuildOptions(options) {
    options.conditions = ['@ghentcdh/crouton'];
  },
});
