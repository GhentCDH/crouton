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
  noExternal: ['@ghentcdh/crouton-core', '@ghentcdh/crouton-codegen'],
  external: [
    '@nestjs/common',
    '@nestjs/core',
    '@nestjs/swagger',
    'nestjs-zod',
    '@prisma/client',
    // Only ever imported lazily by crouton-codegen's introspect() (bundled
    // in via noExternal above), and only exercised when the dev-only
    // resource-sync endpoints are actually called. Kept external so it
    // resolves from the consuming app's own node_modules (alongside their
    // `prisma` dev dependency) rather than being bundled here.
    '@prisma/internals',
    'zod',
  ],
  esbuildOptions(options) {
    options.conditions = ['@ghentcdh/crouton'];
  },
});
