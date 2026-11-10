/// <reference types='vitest' />
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';

import * as path from 'path';

const PRIVATE_SOURCES: Record<string, string> = {
  '@ghentcdh/crouton-ui-vue': '../crouton-ui-vue/src',
  '@ghentcdh/crouton-forms-vue': '../crouton-forms-vue/src',
  '@ghentcdh/crouton-editor-vue': '../crouton-editor-vue/src',
  '@crouton/auth-vue': '../../libs/auth-vue/src',
  '@crouton/auth': '../../libs/auth/src',
  '@crouton/i18n': '../../libs/i18n/src',
  '@crouton/status': '../../libs/status/src',
};

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.spec.ts'],
  },
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/crouton-vue',
  plugins: [
    vue(),
    tailwindcss(),
    tsconfigPaths(),
    // The private workspace packages/libs are bundled into the JS, so emit their
    // declarations next to ours and rewrite their imports to relative paths.
    dts({
      entryRoot: '../..',
      // tsconfig.dts.json adds the private sources as root files; the plugin only
      // emits root files and files Vite transforms (type-only imports never are).
      tsconfigPath: path.join(__dirname, 'tsconfig.dts.json'),
      // Resolve the private packages to their sources (not their prebuilt dist
      // or project-reference output) so their declarations get emitted too.
      compilerOptions: {
        paths: Object.fromEntries(
          Object.entries(PRIVATE_SOURCES).flatMap(([pkg, dir]) => [
            [pkg, [path.join(__dirname, dir, 'index.ts')]],
            [`${pkg}/*`, [path.join(__dirname, dir, '*')]],
          ]),
        ),
      },
      pathsToAliases: false,
      aliases: Object.entries(PRIVATE_SOURCES).map(([pkg, dir]) => ({
        find: new RegExp(`^${pkg}(?=/|$)`),
        replacement: path.join(__dirname, dir),
      })),
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
