# Backend setup

Add crouton to a NestJS application.

## Install

```sh
pnpm add @ghentcdh/crouton-api
```

Peer dependencies (NestJS, Prisma client, Zod, …) are installed automatically by pnpm and npm.

## Register the module

The simplest setup loads everything from the file system — point `forResourceDir` at your resources folder and your data-sources folder:

```ts
import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { CroutonApiModule } from '@ghentcdh/crouton-api';

@Module({
  imports: [
    CroutonApiModule.forResourceDir(
      resolve(__dirname, 'resources'),
      resolve(__dirname, 'data-sources'),
      {
        baseUrl: 'http://localhost:3000',
      },
    ),
  ],
})
export class AppModule {}
```

Every subdirectory of `resources/` is loaded as one resource (see [resource.json](./resource-json.md)); every subdirectory of `data-sources/` provides a database client (see [Data sources](./datasource.md)).

### Other registration styles

| Method | Use when |
| --- | --- |
| `forResourceDir(dir, dataSourcesDir, config)` | Standard file-system convention (recommended) |
| `forResources(configs, dataSources, loader, config)` | Resource configs built in code / in memory |
| `forLoader(loader, configs, dataSources, config)` | Custom loading strategy |

## The schema file

Each resource directory must contain a `schema.ts` that default-exports the Zod schema describing one record. If you generate Zod schemas from your Prisma models, re-export the generated one:

```ts
// resources/book/schema.ts
import { BookSchema } from '../generated/types';

export default BookSchema;
```

## What you get

For a resource with `"route": "books"`, crouton registers (depending on the enabled `operations`):

| Endpoint | Description |
| --- | --- |
| `GET /books` | Paginated list with filtering and sorting |
| `GET /books/:id` | Single record |
| `POST /books` | Create, validated against the Zod schema |
| `PATCH /books/:id` | Update, validated against the Zod schema |
| `DELETE /books/:id` | Delete |
| `GET /books/schemas` | Table / form / view / filter schemas for the frontend |
| `GET /books/definition` | Enabled operations + schemas |
| `POST /books/procedure/:actionId/:recordId` | Row-level [actions](./actions.md) |
| `POST /books/table-action/:actionId` | Table-level [actions](./actions.md) |

One application-wide endpoint feeds the frontend navigation:

| Endpoint | Description |
| --- | --- |
| `GET /_app/layout` | Sidebar items for all resources (respects `sidebar.hide` / `sidebar.position`) |
