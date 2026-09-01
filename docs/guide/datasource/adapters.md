# Datasources & Adapters

## Overview

Each datasource folder (`data-sources/<name>/`) contains a `data-source.json` and an `index.ts`.
The `adapter` field in `data-source.json` selects how crouton-api connects to that datasource.

| `adapter` value | What `index.ts` must export | Use case |
|---|---|---|
| `"prisma"` (default) | A `PrismaClient` instance | Any Prisma-supported database |
| `"custom"` | A `DataSourceAdapter` object | REST APIs, other ORMs, in-memory stores |

Existing projects without an `adapter` field behave exactly as before (Prisma).

## The default Prisma adapter

No changes required. The generated `index.ts` exports a `PrismaClient`:

```ts
// data-sources/maindb/index.ts
import { PrismaClient } from '../../generated/maindb/client';
import { PrismaPg } from '@prisma/adapter-pg';

const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
export default client;
```

`data-source.json` may omit `adapter` or set it to `"prisma"` explicitly.

## Writing a custom adapter

Implement the `DataSourceAdapter` interface from `@ghentcdh/crouton-api` and export it as the
default from `index.ts`:

```ts
// data-sources/external-api/index.ts
import type { DataSourceAdapter } from '@ghentcdh/crouton-api';

const adapter: DataSourceAdapter = {
  kind: 'my-api',

  supports(_model: string): boolean {
    // Return true for every model this adapter can serve.
    return true;
  },

  async disconnect(): Promise<void> {
    // Clean up connections / HTTP clients.
  },
};

export default adapter;
```

## Registering a custom adapter

Set `"adapter": "custom"` in `data-source.json`. Only `name` is required — Prisma fields and
`urlEnv` are optional (a custom adapter's connection config can use anything):

```json
{
  "name": "external-api",
  "adapter": "custom"
}
```

If the adapter needs an env var (e.g. an API key), add it:

```json
{
  "name": "external-api",
  "adapter": "custom",
  "urlEnv": "EXTERNAL_API_KEY"
}
```

Run `crouton create-datasource` and choose **custom** when prompted to generate this scaffold
automatically.

## Example — filesystem adapter

A minimal adapter that stores records as JSON files. Copy it into
`data-sources/filesystem/index.ts` and set `"adapter": "custom"` in `data-source.json`.

```ts
// data-sources/filesystem/index.ts
import type { DataSourceAdapter } from '@ghentcdh/crouton-api';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DATA_DIR = process.env.FILESYSTEM_DATA_DIR ?? '.data';

/** Simple CRUD client backed by one JSON file per model. */
export class FilesystemClient {
  constructor(readonly dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
  }

  private file(model: string): string {
    return join(this.dataDir, `${model}.json`);
  }

  private read(model: string): Record<string, unknown>[] {
    const f = this.file(model);
    return existsSync(f) ? (JSON.parse(readFileSync(f, 'utf-8')) as Record<string, unknown>[]) : [];
  }

  private write(model: string, rows: Record<string, unknown>[]): void {
    writeFileSync(this.file(model), JSON.stringify(rows, null, 2), 'utf-8');
  }

  findAll(model: string): Record<string, unknown>[] {
    return this.read(model);
  }

  findOne(model: string, id: unknown): Record<string, unknown> | null {
    return this.read(model).find((r) => r['id'] === id) ?? null;
  }

  create(model: string, data: Record<string, unknown>): Record<string, unknown> {
    const rows = this.read(model);
    const row = { id: Date.now(), ...data };
    rows.push(row);
    this.write(model, rows);
    return row;
  }

  update(model: string, id: unknown, data: Record<string, unknown>): Record<string, unknown> {
    const rows = this.read(model);
    const idx = rows.findIndex((r) => r['id'] === id);
    if (idx === -1) throw new Error(`${model} with id ${id} not found`);
    rows[idx] = { ...rows[idx], ...data, id };
    this.write(model, rows);
    return rows[idx];
  }

  delete(model: string, id: unknown): Record<string, unknown> {
    const rows = this.read(model);
    const idx = rows.findIndex((r) => r['id'] === id);
    if (idx === -1) throw new Error(`${model} with id ${id} not found`);
    const [removed] = rows.splice(idx, 1);
    this.write(model, rows);
    return removed;
  }
}

const filesystemAdapter: DataSourceAdapter = {
  kind: 'filesystem',
  client: new FilesystemClient(DATA_DIR),

  supports(_model: string): boolean {
    return true; // accepts any model name
  },

  async disconnect(): Promise<void> {
    // no persistent connections to close
  },
};

export default filesystemAdapter;
```

Resources backed by this adapter must use `kind: "custom"` with a `repository.ts` that calls
`ctx.dataSources.resolve('filesystem')` to get the `FilesystemClient`:

```ts
// resources/note/repository.ts
import type { CustomRepository } from '@ghentcdh/crouton-api';
import type { FilesystemClient } from '../../data-sources/filesystem';

export default {
  async findAll(_params, ctx) {
    const db = ctx.dataSources.resolve('filesystem') as FilesystemClient;
    const rows = db.findAll('note');
    return { data: rows, count: rows.length };
  },
  async findOne(id, ctx) {
    const db = ctx.dataSources.resolve('filesystem') as FilesystemClient;
    return db.findOne('note', id) as any;
  },
  async create(data, ctx) {
    const db = ctx.dataSources.resolve('filesystem') as FilesystemClient;
    return db.create('note', data as any) as any;
  },
  async update(_id, data, ctx) {
    const db = ctx.dataSources.resolve('filesystem') as FilesystemClient;
    return db.update('note', _id, data as any) as any;
  },
  async delete(id, ctx) {
    const db = ctx.dataSources.resolve('filesystem') as FilesystemClient;
    return db.delete('note', id) as any;
  },
} satisfies CustomRepository;
```

## Hook context

Resource hooks and custom `repository.ts` files receive `ctx.dataSource: DataSourceAdapter`.
Use it instead of `ctx.prisma` — on a custom adapter `ctx.prisma` is `undefined`.

```ts
// resources/item/hooks.ts
export const hooks = {
  async beforeWrite(data, ctx) {
    const { dataSource } = ctx; // DataSourceAdapter
    // ctx.prisma is deprecated and undefined on non-Prisma adapters
    return data;
  },
};
```

## Limitations

- **Sub-resources** — nested child routes are derived from Prisma relations. A custom adapter
  must expose each child collection as its own top-level resource.
- **Upsert** — `upsert` / `upsertMany` are Prisma-only; a custom adapter resource that enables
  `upsert` will throw `NotImplementedException`.
- **Introspection** — `crouton update resources` runs Prisma `db pull`; it skips datasources
  with `adapter: "custom"` automatically.
- **Migrations** — a custom datasource owns its own schema lifecycle; crouton does not manage
  migrations for it.
