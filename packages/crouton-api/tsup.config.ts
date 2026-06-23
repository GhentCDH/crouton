import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: './dist',
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  noExternal: ['@ghentcdh/crouton-core'],
  external: [
    '@nestjs/common',
    '@nestjs/core',
    '@nestjs/swagger',
    '@anatine/zod-nestjs',
    '@prisma/client',
    'zod',
  ],
  esbuildOptions(options) {
    options.conditions = ['@ghentcdh/crouton'];
  },
});
