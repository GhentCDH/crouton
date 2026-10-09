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
    // FIX 1: Must be rollupOptions, not rolldownOptions
    rollupOptions: {
      // FIX 2: Added common sub-dependencies you likely need externalized
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
        globals: { vue: 'Vue' },
        // Emits compiled Tailwind code as 'styles.css' inside your dist folder
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'styles.css';
          }
          return '[name][extname]';
        },
      },
    },
  },
});
