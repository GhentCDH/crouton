import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

import { resolve } from 'node:path';

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: {
    alias: {
      '@ghentcdh/crouton-codegen': resolve(
        import.meta.dirname,
        '../../packages/crouton-codegen/src/index.ts',
      ),
    },
  },
  test: {
    globals: true,
    include: ['test/**/*.e2e.spec.ts'],
    globalSetup: ['test/crud/global-setup.ts'],
    hookTimeout: 60000,
    testTimeout: 30000,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
