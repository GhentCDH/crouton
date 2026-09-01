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

Set `"adapter": "custom"` in `data-source.json`. Prisma fields are not required:

```json
{
  "name": "external-api",
  "urlEnv": "EXTERNAL_API_URL",
  "adapter": "custom"
}
```

Run `crouton create-datasource` and choose **custom** when prompted to generate this scaffold
automatically.

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
