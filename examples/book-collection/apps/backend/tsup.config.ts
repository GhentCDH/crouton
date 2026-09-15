import { defineConfig } from 'tsup';
import { swcPlugin } from 'esbuild-plugin-swc';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  outDir: '../../dist/apps/backend',
  clean: true,
  sourcemap: true,
  platform: 'node',
  target: 'node22',
  keepNames: true,
  esbuildPlugins: [
    swcPlugin({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    }),
  ],
  noExternal: [/@ghentcdh\/.*/],
});
