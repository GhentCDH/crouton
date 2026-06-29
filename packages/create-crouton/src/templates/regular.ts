/**
 * File set for the regular (single-package) layout.
 */

import { appModuleRegular, croutonEnumsJson,
  croutonJson, dataSourceIndex,
  dataSourceJson, envExample, envFile,
  gitignore,
  mainTs, nvmrc, prismaConfig,
  prismaSchema,
} from './shared.js';
import type { ScaffoldFile } from '../lib/files.js';
import type { Tokens } from '../lib/render.js';

const packageJson = (t: Tokens, includeFrontend: boolean): string =>
  JSON.stringify(
    {
      name: t.name,
      version: '0.0.1',
      type: 'module',
      scripts: {
        dev: 'ts-node-esm src/main.ts',
        build: 'tsc -p tsconfig.json',
        start: 'node dist/main.js',
        'prisma:migrate': 'prisma migrate dev',
        'prisma:generate': 'prisma generate',
        crouton: 'crouton',
        ...(includeFrontend ? { 'dev:all': 'concurrently "npm run dev" "cd frontend && npm run dev"' } : {}),
      },
      dependencies: {
        '@ghentcdh/crouton-api': '*',
        '@ghentcdh/crouton-core': '*',
        '@nestjs/common': '^11.0.0',
        '@nestjs/core': '^11.0.0',
        '@nestjs/platform-fastify': '^11.0.0',
        '@nestjs/serve-static': '^5.0.0',
        '@prisma/adapter-pg': '*',
        'reflect-metadata': '^0.2.0',
        zod: '^3.0.0',
      },
      devDependencies: {
        '@ghentcdh/crouton-cli': '*',
        prisma: '*',
        'zod-prisma-types': '^3.0.0',
        '@nestjs/cli': '^11.0.0',
        typescript: '^5.0.0',
        dotenv: '^16.0.0',
        ...(includeFrontend ? { concurrently: '^9.0.0' } : {}),
      },
    },
    null,
    2,
  ) + '\n';

const tsconfig = (): string =>
  JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        outDir: 'dist',
        rootDir: 'src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
      },
      include: ['src'],
      exclude: ['node_modules', 'dist'],
    },
    null,
    2,
  ) + '\n';

const readmeRegular = (t: Tokens): string => `
# ${t.name}

Scaffolded with [create-crouton](https://github.com/GhentCDH/crouton).

## Quick start

\`\`\`bash
# 1. Start Postgres
docker compose -f docker/compose.yml up -d db

# 2. Run first migration
${t.pm} prisma migrate dev --name init

# 3. Generate resource configs
${t.pm} crouton update resources

# 4. Start dev server
${t.pmRun} dev
\`\`\`

> ⚠️  \`@ghentcdh/*\` packages must be published to npm before \`${t.pm} install\` works.
`.trimStart();

const frontendViteConfig = (t: Tokens): string => `
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: ${t.frontendPort},
    proxy: {
      '/api': 'http://localhost:${t.backendPort}',
    },
  },
});
`.trimStart();

const frontendMainTs = (): string => `
import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');
`.trimStart();

const frontendAppVue = (t: Tokens): string => `
<script setup lang="ts">
import { useCrouton } from '@ghentcdh/crouton-vue';

const crouton = useCrouton();
crouton.init({ baseUrl: 'http://localhost:${t.backendPort}' });
</script>

<template>
  <div id="app">
    <!-- Crouton admin UI -->
    <crouton-app />
  </div>
</template>
`.trimStart();

const frontendPackageJson = (t: Tokens): string =>
  JSON.stringify(
    {
      name: `${t.name}-frontend`,
      version: '0.0.1',
      type: 'module',
      scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
      dependencies: {
        '@ghentcdh/crouton-vue': '*',
        '@ghentcdh/json-forms-vue': '*',
        vue: '^3.0.0',
      },
      devDependencies: {
        vite: '^6.0.0',
        '@vitejs/plugin-vue': '^5.0.0',
      },
    },
    null,
    2,
  ) + '\n';

export const buildRegularFiles = (t: Tokens, opts: { includeFrontend: boolean; sample: boolean }): ScaffoldFile[] => {
  const files: ScaffoldFile[] = [
    { path: 'package.json', contents: packageJson(t, opts.includeFrontend) },
    { path: 'tsconfig.json', contents: tsconfig() },
    { path: '.gitignore', contents: gitignore() },
    { path: '.env', contents: envFile(t) },
    { path: '.env.example', contents: envExample(t) },
    { path: '.nvmrc', contents: nvmrc() },
    { path: 'README.md', contents: readmeRegular(t) },
    { path: 'crouton.json', contents: croutonJson('resources', 'data-sources') },
    { path: 'crouton.enums.json', contents: croutonEnumsJson() },
    { path: 'prisma/schema.prisma', contents: prismaSchema('src/generated', opts.sample) },
    { path: 'prisma.config.ts', contents: prismaConfig(t.urlEnv) },
    { path: 'data-sources/default/data-source.json', contents: dataSourceJson('default', `${t.name}/generated`, t.urlEnv, 'src/generated') },
    { path: 'data-sources/default/index.ts', contents: dataSourceIndex(t.urlEnv) },
    { path: 'src/main.ts', contents: mainTs(t.backendPort) },
    { path: 'src/app.module.ts', contents: appModuleRegular() },
    { path: 'resources/.gitkeep', contents: '' },
  ];

  if (opts.sample) {
    files.push({
      path: 'resources/note/resource.json',
      contents: JSON.stringify(
        {
          model: 'note',
          database: 'default',
          views: { table: { columns: { id: { sort: true }, title: { sort: true } } } },
          columns: {
            id: { fieldInput: { format: 'number' }, sidebar: { hide: true } },
            title: { fieldInput: { format: 'text' } },
            body: { fieldInput: { format: 'textarea' } },
            created_at: { fieldInput: { format: 'date' }, sidebar: { hide: true } },
            updated_at: { fieldInput: { format: 'date' }, sidebar: { hide: true } },
          },
        },
        null,
        2,
      ) + '\n',
    });
  }

  if (opts.includeFrontend) {
    files.push(
      { path: 'frontend/package.json', contents: frontendPackageJson(t) },
      { path: 'frontend/vite.config.ts', contents: frontendViteConfig(t) },
      { path: 'frontend/index.html', contents: '<!DOCTYPE html>\n<html><body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>\n' },
      { path: 'frontend/src/main.ts', contents: frontendMainTs() },
      { path: 'frontend/src/App.vue', contents: frontendAppVue(t) },
    );
  }

  return files;
};
