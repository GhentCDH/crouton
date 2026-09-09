# Datasources & Adapters

## kind vs adapter — two orthogonal axes

Every resource has two independent settings:

| Setting | What it controls | Values |
|---|---|---|
| `kind` | Where the **schema** comes from | `"prisma"` (generated `schema.ts`) · `"custom"` (column-based JSON Schema) |
| `adapter` | How **data is accessed** | `"prisma"` (PrismaClient) · `"custom"` (your `DataSourceAdapter`) |

These are set in different places and are fully independent:

| `kind` | `adapter` | Typical use case |
|---|---|---|
| `"prisma"` (default) | `"prisma"` (default) | Normal Prisma-backed resource |
| `"custom"` | `"prisma"` | Per-resource hand-written `repository.ts` on a Prisma DB |
| `"prisma"` | `"custom"` | Resource on a non-Prisma backend — **no `repository.ts` needed** |
| `"custom"` | `"custom"` | Per-resource hand-written `repository.ts` on a custom datasource |

`kind` lives in `resource.json`; `adapter` lives in `data-source.json`.

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

The recommended approach is to extend `PrismaDataSourceAdapter` from `@ghentcdh/crouton-api`.
Every Prisma-backed method is available by default — override only what you need to customise.

```ts
// data-sources/my-api/index.ts
import { PrismaDataSourceAdapter } from '@ghentcdh/crouton-api';
import type { AdapterCrudContext } from '@ghentcdh/crouton-api';
import type { ListRequest } from '@ghentcdh/crouton-core';

export default class MyApiAdapter extends PrismaDataSourceAdapter {
  constructor() {
    super(null); // replace null with a real PrismaClient if you still need Prisma for some models
  }

  override async findAll(
    model: string,
    params: ListRequest,
    ctx: AdapterCrudContext,
  ): Promise<{ data: any[]; count: number }> {
    const res = await fetch(`https://my-api.example.com/${model}?page=${params.page}`);
    const body = await res.json();
    return { data: body.items, count: body.total };
  }

  override async findOne(model: string, id: string | number, ctx: AdapterCrudContext) {
    const res = await fetch(`https://my-api.example.com/${model}/${id}`);
    if (res.status === 404) return null;
    return res.json();
  }
}
```

Override any subset of: `findAll`, `count`, `findOne`, `create`, `update`, `patch`, `delete`,
`findAllByParent`, `findOneChild`, `createChild`, `updateChild`, `deleteChild`.
Methods you don't override fall through to the base class (which calls Prisma, or throws
`NotImplementedException` when the client is `null`).

### Starting from scratch (no Prisma)

When the backend is entirely custom, pass `null` to `super()` and implement every operation
the resource needs. Unimplemented operations throw `NotImplementedException` if the resource
enables them.

### Plain object (legacy)

You can still export a plain object satisfying `DataSourceAdapter`, but the class form is
preferred because it lets you inherit Prisma behaviour for models that do live in your database:

```ts
import type { DataSourceAdapter } from '@ghentcdh/crouton-api';

export default {
  kind: 'my-api',
  supports: (_model: string) => true,
  async healthCheck(): Promise<void> {
    // Optional. Throw to report the datasource as disconnected on the status page.
    const ok = await fetch('https://api.example.com/health').then((r) => r.ok);
    if (!ok) throw new Error('API health check failed');
  },
  async disconnect(): Promise<void> {
    // Clean up connections / HTTP clients.
  },
} satisfies DataSourceAdapter;
```

## Registering a custom adapter

Set `"adapter": "custom"` in `data-source.json`. Only `name` is required:

```json
{
  "name": "my-api",
  "adapter": "custom"
}
```

If the adapter needs an env var (e.g. an API key), add it:

```json
{
  "name": "my-api",
  "adapter": "custom",
  "urlEnv": "MY_API_KEY"
}
```

Run `crouton create-datasource` and choose **custom** when prompted to generate this scaffold
automatically.

## Resources on a custom adapter

Resources that point at a custom-adapter datasource do **not** need `kind: "custom"` or a
`repository.ts`. They declare a `model` as usual; the adapter's `findAll`, `findOne`, etc.
are called with that model name:

```jsonc
// resources/item/resource.json
{
  "$schema": "...",
  "kind": "prisma",     // schema from generated schema.ts (or omit — prisma is the default)
  "name": "item",
  "route": "items",
  "model": "Item",      // passed as the first argument to every adapter method
  "database": "my-api", // selects the custom-adapter datasource
  "operations": { "findAll": true, "findOne": true, "create": true }
}
```

The adapter's method receives the model name and can route to the right backend endpoint:

```ts
override async findAll(model: string, params: ListRequest, ctx: AdapterCrudContext) {
  // model === 'Item'
  const res = await fetch(`https://api.example.com/${model.toLowerCase()}s?...`);
  ...
}
```

Hook (`hooks.ts`) decoration and valueLabel columns apply exactly as on Prisma resources.

## Composable adapter — enriching Prisma results

The extend pattern lets you decorate data from a Prisma database without a per-resource
`repository.ts`. Override only the methods where you need the enrichment:

```ts
// data-sources/maindb/index.ts
import { PrismaDataSourceAdapter } from '@ghentcdh/crouton-api';
import type { AdapterCrudContext } from '@ghentcdh/crouton-api';
import type { ListRequest } from '@ghentcdh/crouton-core';
import { prisma } from './client';

export default class EnrichedAdapter extends PrismaDataSourceAdapter {
  constructor() {
    super(prisma);
  }

  override async findAll(model: string, params: ListRequest, ctx: AdapterCrudContext) {
    const result = await super.findAll(model, params, ctx);
    if (model === 'Annotation') {
      return { ...result, data: result.data.map(addPermissions) };
    }
    return result;
  }
}
```

This is useful when per-resource `hooks.ts` would be the same across many resources, or when
the enrichment needs access to the datasource's own client rather than the resource config.

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

- **Sub-resources** — implement `findAllByParent`, `findOneChild`, `createChild`, `updateChild`,
  `deleteChild` on the adapter; or expose each child collection as its own top-level resource.
- **Upsert** — `upsert` / `upsertMany` are not part of the adapter interface; a resource that
  enables `upsert` on a custom adapter will throw `NotImplementedException`.
- **Introspection** — `crouton update resources` runs Prisma `db pull`; it skips datasources
  with `adapter: "custom"` automatically.
- **Migrations** — a custom datasource owns its own schema lifecycle; crouton does not manage
  migrations for it.
