import { defineConfig } from 'vitest/config';

import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    conditions: ['@ghentcdh/crouton'],
    // crouton-codegen's exports point at ../../dist, which vite rejects (same alias as crouton-api).
    alias: {
      '@ghentcdh/crouton-codegen': resolve(import.meta.dirname, '../crouton-codegen/src/index.ts'),
    },
  },
  test: {
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    testTimeout: 30_000,
  },
});
