import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: '../../dist/crouton-codegen',
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  // `@prisma/internals` is large and ships with the consumer's Prisma install;
  // never bundle it. It is imported lazily by the introspect stage.
  external: ['@prisma/internals'],
  esbuildOptions(options) {
    options.conditions = ['@ghentcdh/crouton'];
  },
});
