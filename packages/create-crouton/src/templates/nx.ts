/**
 * File set for the Nx monorepo layout.
 * Mirrors the new_polities structure.
 */

import { croutonEnumsJson,
  croutonJson, dataSourceIndex,
  dataSourceJson, envExample, envFile,
  gitignore,
  mainTs, nvmrc, prismaConfig,
  prismaSchema,
} from './shared.js';
import type { ScaffoldFile } from '../lib/files.js';
import type { Tokens } from '../lib/render.js';

const nxJson = (t: Tokens): string =>
  JSON.stringify(
    {
      $schema: './node_modules/nx/schemas/nx-schema.json',
      namedInputs: {
        default: ['{projectRoot}/**/*', 'sharedGlobals'],
        sharedGlobals: [],
      },
      plugins: [
        { plugin: '@nx/eslint/plugin', options: { targetName: 'lint' } },
        { plugin: '@nx/vite/plugin', options: { buildTargetName: 'build', serveTargetName: 'serve', typecheckTargetName: 'typecheck' } },
        { plugin: '@nx/js/typescript', options: { typecheck: { targetName: 'typecheck' }, build: { targetName: 'build', configName: 'tsconfig.lib.json' } } },
      ],
      release: {
        projects: [`${t.backendAppName}`, `${t.frontendAppName}`],
      },
      analytics: false,
      neverConnectToCloud: true,
    },
    null,
    2,
  ) + '\n';

const pnpmWorkspace = (t: Tokens): string => `
packages:
  - 'apps/*'
  - 'generated/*'
  - 'libs/*'
`.trimStart();

const rootPackageJson = (t: Tokens): string =>
  JSON.stringify(
    {
      name: t.name,
      version: '0.0.1',
      private: true,
      scripts: {
        dev: `nx run-many --target=serve --projects=${t.backendAppName},${t.frontendAppName} --parallel`,
        build: 'nx run-many --target=build --all',
        'prisma:migrate': 'prisma migrate dev',
        'prisma:generate': 'prisma generate',
        crouton: 'crouton',
      },
      devDependencies: {
        nx: '^21.0.0',
        '@nx/eslint': '^21.0.0',
        '@nx/js': '^21.0.0',
        '@nx/vite': '^21.0.0',
        typescript: '^5.0.0',
        '@ghentcdh/crouton-cli': '*',
        prisma: '*',
        'zod-prisma-types': '^3.0.0',
        dotenv: '^16.0.0',
      },
    },
    null,
    2,
  ) + '\n';

const rootTsconfig = (t: Tokens): string =>
  JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        skipLibCheck: true,
        paths: {
          [`@${t.name}/generated-types`]: ['./generated/types/src/index.ts'],
        },
        customConditions: ['@ghentcdh/crouton'],
      },
    },
    null,
    2,
  ) + '\n';

const backendProjectJson = (t: Tokens): string =>
  JSON.stringify(
    {
      name: t.backendAppName,
      $schema: '../../node_modules/nx/schemas/project-schema.json',
      projectType: 'application',
      sourceRoot: `apps/${t.backendAppName}/src`,
      targets: {
        serve: { command: 'ts-node-esm src/main.ts', options: { cwd: `apps/${t.backendAppName}` } },
        build: { command: 'tsc -p tsconfig.json', options: { cwd: `apps/${t.backendAppName}` } },
      },
    },
    null,
    2,
  ) + '\n';

const backendPackageJson = (t: Tokens): string =>
  JSON.stringify(
    {
      name: `@${t.name}/${t.backendAppName}`,
      version: '0.0.1',
      type: 'module',
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
        [`@${t.name}/generated-types`]: 'workspace:*',
      },
      devDependencies: { '@nestjs/cli': '^11.0.0', typescript: '^5.0.0' },
    },
    null,
    2,
  ) + '\n';

const backendTsconfig = (): string =>
  JSON.stringify(
    {
      extends: '../../tsconfig.base.json',
      compilerOptions: {
        outDir: 'dist',
        rootDir: 'src',
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
      },
      include: ['src'],
      exclude: ['node_modules', 'dist'],
    },
    null,
    2,
  ) + '\n';

const appModuleNx = (t: Tokens): string => `
import { Module } from '@nestjs/common';
import { CroutonApiModule } from '@ghentcdh/crouton-api';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..', '..', '..', '..'); // workspace root

@Module({
  imports: [
    CroutonApiModule.forResourceDir(
      join(__dirname, 'resources'),
      join(root, 'data-sources'),
      { enumsFile: join(root, 'crouton.enums.json') },
    ),
    ServeStaticModule.forRoot({
      rootPath: join(root, 'public'),
      exclude: ['/api/(.*)'],
    }),
  ],
})
export class AppModule {}
`.trimStart();

const generatedTypesPackageJson = (t: Tokens): string =>
  JSON.stringify(
    {
      name: `@${t.name}/generated-types`,
      version: '0.0.1',
      type: 'module',
      main: './src/index.ts',
      exports: { '.': './src/index.ts' },
    },
    null,
    2,
  ) + '\n';

const frontendProjectJson = (t: Tokens): string =>
  JSON.stringify(
    {
      name: t.frontendAppName,
      $schema: '../../node_modules/nx/schemas/project-schema.json',
      projectType: 'application',
      sourceRoot: `apps/${t.frontendAppName}/src`,
    },
    null,
    2,
  ) + '\n';

const frontendPackageJson = (t: Tokens): string =>
  JSON.stringify(
    {
      name: `@${t.name}/${t.frontendAppName}`,
      version: '0.0.1',
      type: 'module',
      scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
      dependencies: {
        '@ghentcdh/crouton-vue': '*',
        '@ghentcdh/json-forms-vue': '*',
        vue: '^3.0.0',
      },
      devDependencies: { vite: '^6.0.0', '@vitejs/plugin-vue': '^5.0.0' },
    },
    null,
    2,
  ) + '\n';

const frontendViteConfig = (t: Tokens): string => `
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: ${t.frontendPort},
    proxy: { '/api': 'http://localhost:${t.backendPort}' },
  },
  build: { outDir: '../../public', emptyOutDir: true },
});
`.trimStart();

const frontendAppVue = (t: Tokens): string => `
<script setup lang="ts">
import { useCrouton } from '@ghentcdh/crouton-vue';
useCrouton().init({ baseUrl: 'http://localhost:${t.backendPort}' });
</script>

<template>
  <crouton-app />
</template>
`.trimStart();

const readmeNx = (t: Tokens): string => `
# ${t.name}

Nx monorepo scaffolded with [create-crouton](https://github.com/GhentCDH/crouton).

## Quick start

\`\`\`bash
docker compose -f docker/compose.yml up -d db
${t.pm} prisma migrate dev --name init
${t.pm} crouton update resources
${t.pmRun} dev
\`\`\`

> ⚠️  \`@ghentcdh/*\` packages must be published before \`${t.pm} install\` works.
`.trimStart();

export const buildNxFiles = (t: Tokens, opts: { includeFrontend: boolean; sample: boolean }): ScaffoldFile[] => {
  const be = t.backendAppName;
  const fe = t.frontendAppName;
  const resDir = `apps/${be}/src/app/resources`;
  const dsDir = 'data-sources';

  const files: ScaffoldFile[] = [
    { path: 'nx.json', contents: nxJson(t) },
    { path: 'pnpm-workspace.yaml', contents: pnpmWorkspace(t) },
    { path: 'package.json', contents: rootPackageJson(t) },
    { path: 'tsconfig.base.json', contents: rootTsconfig(t) },
    { path: '.gitignore', contents: gitignore() },
    { path: '.env', contents: envFile(t) },
    { path: '.env.example', contents: envExample(t) },
    { path: '.nvmrc', contents: nvmrc() },
    { path: 'README.md', contents: readmeNx(t) },
    { path: 'crouton.json', contents: croutonJson(resDir, dsDir) },
    { path: 'crouton.enums.json', contents: croutonEnumsJson() },
    { path: 'prisma/schema.prisma', contents: prismaSchema(`generated/${be}/src`, opts.sample) },
    { path: 'prisma.config.ts', contents: prismaConfig(t.urlEnv) },
    { path: `${dsDir}/default/data-source.json`, contents: dataSourceJson('default', `@${t.name}/generated-types`, t.urlEnv, `generated/${be}/src`) },
    { path: `${dsDir}/default/index.ts`, contents: dataSourceIndex(t.urlEnv) },
    // Backend app
    { path: `apps/${be}/project.json`, contents: backendProjectJson(t) },
    { path: `apps/${be}/package.json`, contents: backendPackageJson(t) },
    { path: `apps/${be}/tsconfig.json`, contents: backendTsconfig() },
    { path: `apps/${be}/src/main.ts`, contents: mainTs(t.backendPort) },
    { path: `apps/${be}/src/app/app.module.ts`, contents: appModuleNx(t) },
    { path: `apps/${be}/src/app/resources/.gitkeep`, contents: '' },
    // Generated types workspace package
    { path: `generated/${be}/package.json`, contents: generatedTypesPackageJson(t) },
    { path: `generated/${be}/src/index.ts`, contents: '// Generated by zod-prisma-types — do not edit\n' },
    // Libs placeholder
    { path: 'libs/.gitkeep', contents: '' },
  ];

  if (opts.sample) {
    files.push({
      path: `apps/${be}/src/app/resources/note/resource.json`,
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
      { path: `apps/${fe}/project.json`, contents: frontendProjectJson(t) },
      { path: `apps/${fe}/package.json`, contents: frontendPackageJson(t) },
      { path: `apps/${fe}/vite.config.ts`, contents: frontendViteConfig(t) },
      { path: `apps/${fe}/index.html`, contents: '<!DOCTYPE html>\n<html><body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>\n' },
      { path: `apps/${fe}/src/main.ts`, contents: 'import { createApp } from \'vue\';\nimport App from \'./App.vue\';\ncreateApp(App).mount(\'#app\');\n' },
      { path: `apps/${fe}/src/App.vue`, contents: frontendAppVue(t) },
    );
  }

  return files;
};
