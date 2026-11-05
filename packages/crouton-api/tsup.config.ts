import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/testing/index.ts'],
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
    '@nestjs/microservices',
    '@nestjs/testing',
    '@nestjs/swagger',
    '@nestjs/passport',
    'nestjs-zod',
    '@prisma/client',
    // Only ever imported lazily by crouton-codegen's introspect() (bundled
    // in via noExternal above), and only exercised when the dev-only
    // resource-sync endpoints are actually called. Kept external so it
    // resolves from the consuming app's own node_modules (alongside their
    // `prisma` dev dependency) rather than being bundled here.
    '@prisma/internals',
    'zod',
    // passport and strategies are CJS and use dynamic require() for Node
    // built-ins; bundling them into ESM breaks at runtime.
    'passport',
    'passport-google-oauth20',
    'passport-http-bearer',
    'passport-openidconnect',
    'passport-microsoft',
  ],
  esbuildOptions(options) {
    options.conditions = ['@ghentcdh/crouton'];
  },
});
