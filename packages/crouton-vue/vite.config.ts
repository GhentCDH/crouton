/// <reference types='vitest' />
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';

import * as path from 'path';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/crouton-vue',
  plugins: [
    vue(),
    tailwindcss(),
    tsconfigPaths(),
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(__dirname, 'tsconfig.lib.json'),
      rollupTypes: true,
    }),
  ],
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      entry: 'src/index.ts',
      name: 'crouton-vue',
      fileName: 'index',
      formats: ['es'],
    },
    rolldownOptions: {
      external: [
        '@jsonforms/core',
        'axios',
        'lodash-es',
        'vue',
        'vee-validate',
        'vue-router',
        'zod',
      ],
      output: {
        assetFileNames: 'styles[extname]',
      },
    },
  },
});
