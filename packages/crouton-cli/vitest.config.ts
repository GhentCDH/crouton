import { defineConfig } from 'vitest/config';

import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    conditions: ['@ghentcdh/crouton'],
    // Workspace packages → source: crouton-codegen's exports point at ../../dist (vite rejects them),
    // create-crouton's would resolve to a possibly stale dist.
    alias: {
      '@ghentcdh/crouton-codegen': resolve(import.meta.dirname, '../crouton-codegen/src/index.ts'),
      '@ghentcdh/create-crouton/lib': resolve(import.meta.dirname, '../create-crouton/src/lib/index.ts'),
    },
  },
  test: {
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    testTimeout: 30_000,
  },
});
