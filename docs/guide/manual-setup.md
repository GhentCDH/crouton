# Manual setup

Add crouton to an existing NestJS project without using the CLI scaffolding tools (`create-crouton` or `add-crouton`).

## 1. Install dependencies

### Backend

```sh
# Runtime
pnpm add @ghentcdh/crouton-api @prisma/adapter-pg @prisma/client dotenv tslib zod

# Dev
pnpm add -D @ghentcdh/crouton-cli prisma zod-prisma-types
```

### Frontend (optional, Vue 3)

```sh
pnpm add @ghentcdh/crouton-vue @ghentcdh/crouton-forms-vue vue
pnpm add -D vite @vitejs/plugin-vue
```

## 2. Create the project config

### crouton.json

Create `crouton.json` at the project root (or workspace root for Nx):

```json
{
  "resourcesDir": "src/app/resources",
  "dataSourcesDir": "src/app/data-sources",
  "enumsFile": "crouton.enums.json"
}
```

For Nx monorepos with apps in subdirectories, adjust paths accordingly:

```json
{
  "resourcesDir": "apps/backend/src/app/resources",
  "dataSourcesDir": "apps/backend/src/app/data-sources",
  "enumsFile": "crouton.enums.json"
}
```

### crouton.enums.json

Create an empty enum registry:

```json
{}
```

## 3. Set up a data source

### Prisma schema

Create `prisma/default/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../../generated/default/client/src"
}

generator zod {
  provider                         = "zod-prisma-types"
  output                           = "../../generated/default/types/src"
  addInputTypeValidation           = "false"
  createInputTypes                 = "false"
  createModelTypes                 = "true"
  createOptionalDefaultValuesTypes = "false"
  createRelationValuesTypes        = "true"
  useMultipleFiles                 = "true"
  writeBarrelFiles                 = "true"
}

datasource db {
  provider = "postgresql"
  // url is provided by prisma.config.ts (Prisma 7 forbids url here)
}
```

### Prisma config

Create `prisma/default/prisma.config.ts`:

```ts
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/default/schema.prisma',
  migrations: {
    path: 'prisma/default/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
```

### Data source folder

Create `src/app/data-sources/default/data-source.json`:

```json
{
  "type": "postgres",
  "name": "default",
  "default": true,
  "prismaSchema": "prisma/default/schema.prisma",
  "urlEnv": "DATABASE_URL",
  "generatedTypesImport": "@my-app/generated/default/types",
  "zodOutput": "generated/default/types/src",
  "prismaConfig": "prisma/default/prisma.config.ts"
}
```

Create `src/app/data-sources/default/index.ts`:

```ts
import { PrismaClient } from '../../generated/default/client/src';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const client = new PrismaClient({ adapter });

export default client;
```

## 4. Configure TypeScript paths

### Standalone project

In `tsconfig.json`, add path aliases for the generated types and client:

```json
{
  "compilerOptions": {
    "paths": {
      "@my-app/generated/default/types": ["./generated/default/types/src"],
      "@my-app/generated/default/client": ["./generated/default/client/src"]
    }
  }
}
```

### Nx monorepo

In `tsconfig.base.json` at the workspace root:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@my-app/generated/default/types": ["./generated/default/types/src"],
      "@my-app/generated/default/client": ["./generated/default/client/src"]
    }
  }
}
```

If using a prefix subfolder (e.g. `split`), adjust the paths:

```json
{
  "compilerOptions": {
    "paths": {
      "@my-app/generated/default/types": ["./split/generated/default/types/src"],
      "@my-app/generated/default/client": ["./split/generated/default/client/src"]
    }
  }
}
```

## 5. Register the NestJS module

In your app module:

```ts
import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CroutonApiModule } from '@ghentcdh/crouton-api';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    CroutonApiModule.forResourceDir(
      resolve(__dirname, 'resources'),
      resolve(__dirname, 'data-sources'),
      {
        baseUrl: '/api',
        title: 'My App',
        enumsFile: resolve(__dirname, '..', '..', 'crouton.enums.json'),
      },
    ),
  ],
})
export class AppModule {}
```

## 6. Environment file

Create `.env`:

```env
DATABASE_URL=postgresql://crouton:crouton@localhost:5432/my_app?schema=public
```

## 7. Generate Prisma client and types

```sh
npx prisma migrate dev --config prisma/default/prisma.config.ts
```

This creates the initial migration, generates the Prisma client, and runs zod-prisma-types.

## 8. Generate resources

```sh
npx crouton update resources
```

This introspects your database, lets you pick which models to expose, and generates `resource.json` + `schema.ts` files per resource.

## 9. Frontend app (Vue 3)

### Install dependencies

```sh
pnpm add @ghentcdh/crouton-vue @ghentcdh/crouton-forms-vue axios vue vue-router
pnpm add -D vite @vitejs/plugin-vue @types/node typescript
```

### index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

### API client

Create `src/api.ts`:

```ts
import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
});
```

### Entry point

Create `src/main.ts`:

```ts
import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { useCrouton, CroutonRouter } from '@ghentcdh/crouton-vue';
import '@ghentcdh/crouton-vue/styles.css';
import { api } from './api';
import App from './App.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'admin',
      children: [...CroutonRouter],
    },
  ],
});

useCrouton()
  .init(api, { title: 'My App' })
  .then(() => {
    const app = createApp(App);
    app.use(router);
    app.mount('#app');
  });
```

### App component

Create `src/App.vue`:

```vue
<template>
  <router-view />
</template>

<script setup lang="ts">
</script>
```

### Vite config

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 4200,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

The proxy forwards `/api` requests to the NestJS backend during development.

### Frontend tsconfig.json (Nx only)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "preserve",
    "jsxImportSource": "vue"
  },
  "include": ["src/**/*.ts", "src/**/*.vue"],
  "exclude": ["node_modules", "dist"]
}
```

## 10. Start the dev server

```sh
pnpm dev
```

For more frontend configuration, see [Frontend setup](./frontend.md).

## Nx workspace extras

For Nx monorepos, you also need:

### pnpm-workspace.yaml

```yaml
packages:
  - apps/*
  - generated/default/*
  - libs/*
```

### nx.json

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "defaultBase": "main"
}
```

### Backend tsconfig.json

Backend app tsconfigs should extend the base:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "sourceMap": true,
    "incremental": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### Generated package.json files

Each generated output needs a `package.json` for workspace resolution:

`generated/default/types/package.json`:
```json
{
  "name": "@my-app/generated-default-types",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts"
}
```

`generated/default/client/package.json`:
```json
{
  "name": "@my-app/generated-default-client",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts"
}
```
