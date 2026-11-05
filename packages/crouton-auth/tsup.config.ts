import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: './dist',
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  shims: true,
  external: ['zod'],
  esbuildOptions(options) {
    options.conditions = ['@ghentcdh/crouton'];
  },
  // Regenerate the JSON Schema from the freshly built ESM after every build.
  onSuccess: 'node scripts/gen-auth-provider-schema.mjs',
});
