# Data sources

A data source is a named database client that resources read from and write to. Data sources live in their own
directory, passed as the second argument to `CroutonApiModule.forResourceDir`.

## Folder convention

```
data-sources/
└── maindb/
    ├── data-source.json
    └── index.ts
```

## data-source.json

Every datasource is **self-describing**: a single `data-source.json` holds both what the runtime needs to connect and
what the CLI / codegen needs to introspect and generate.

```json
{
  "type": "postgres",
  "name": "maindb",
  "default": true,
  "prismaSchema": "prisma/maindb/schema.prisma",
  "urlEnv": "DATABASE_URL",
  "generatedTypesImport": "@my-app/generated/maindb",
  "zodOutput": "generated/maindb/src",
  "clientOutput": "generated/maindb/client",
  "prismaConfig": "prisma/maindb/prisma.config.ts"
}
```

### Runtime fields

| Field     | Description                                                                                                               |
|-----------|---------------------------------------------------------------------------------------------------------------------------|
| `name`    | **Required.** Unique identifier used by resources to select this data source (the `database` field in `resource.json`).   |
| `type`    | Client type — currently `"postgres"`.                                                                                     |
| `adapter` | Optional. Adapter type override — `"prisma"` (default) or `"custom"` (see [Custom adapter](#custom-adapter)).            |
| `default` | Used by resources that don't specify a `database`. Exactly one datasource may be `default`.                               |

### Codegen fields

| Field                  | Description                                                                                       |
|------------------------|---------------------------------------------------------------------------------------------------|
| `prismaSchema`         | Path to this datasource's Prisma schema, relative to the project root.                            |
| `urlEnv`               | Env var holding the connection URL used when the CLI runs `prisma db pull` / `generate`.          |
| `generatedTypesImport` | Import path for this datasource's generated Zod types. New `schema.ts` files re-export from here. |
| `zodOutput`            | Zod types output dir (project-relative). Passed to `crouton-prisma` as `zodOutput`.               |
| `clientOutput`         | Prisma client output dir (project-relative). Should match the `output` in the generator block.    |
| `prismaConfig`         | Prisma config file for this datasource. Defaults to `prisma/<name>/prisma.config.ts`.             |

## index.ts

Default-export a configured `PrismaClient`:

```ts
import { PrismaClient } from '../../generated/maindb/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const client = new PrismaClient({ adapter });

export default client;
```

## `kind` vs `adapter` — two orthogonal axes

These two settings are independent and set in different places:

| Setting  | Where            | Controls                                                                              |
|----------|------------------|---------------------------------------------------------------------------------------|
| `kind`   | `resource.json`  | **Schema source**: `"prisma"` (generated `schema.ts`) or `"custom"` (column JSON Schema) |
| `adapter`| `data-source.json` | **Data access**: `"prisma"` (PrismaClient, default) or `"custom"` (your adapter class) |

| `kind`      | `adapter`    | Typical use case                                                    |
|-------------|--------------|---------------------------------------------------------------------|
| `"prisma"`  | `"prisma"`   | Normal Prisma-backed resource (default)                             |
| `"prisma"`  | `"custom"`   | Resource on a non-Prisma backend — no `repository.ts` needed        |
| `"custom"`  | `"custom"`   | Column-defined resource on a non-Prisma backend                     |
| `"custom"`  | `"prisma"`   | Hand-written `repository.ts` on a Prisma DB                         |

A resource on a **non-Prisma backend** does **not** need `kind: "custom"`. Point it at a custom-adapter datasource and
use a normal `kind: "prisma"` resource with a `model`. The adapter handles CRUD; no `repository.ts` needed.

Use `kind: "custom"` only when the data has no Prisma model (columns defined by hand), or you need per-resource
hand-written data access via a `repository.ts`. See [Custom resources](../2.resources/custom-resource.md).

## Multiple databases

Add one folder per database and reference them by name. Each datasource owns a **separate Prisma schema and generated
output** so the generated clients and Zod types never collide:

```
prisma/
├── maindb/schema.prisma       # generator output → generated/maindb
└── archivedb/schema.prisma

data-sources/
├── maindb/                    # default: true
└── archivedb/
```

Resources without a `database` field use the data source marked `default: true`.

## Custom adapter

Set `"adapter": "custom"` in `data-source.json` to use a hand-written adapter instead of the built-in Prisma one:

```json
{
  "name": "my-api",
  "adapter": "custom"
}
```

The recommended approach is to extend `PrismaDataSourceAdapter` from `@ghentcdh/crouton-api`.
Every Prisma-backed method is available by default — override only what you need to customise:

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

Run `crouton create-datasource` and choose **custom** when prompted to generate this scaffold automatically.

### Starting from scratch (no Prisma)

When the backend is entirely custom, pass `null` to `super()` and implement every operation the resource needs:

```ts
export default class MyApiAdapter extends PrismaDataSourceAdapter {
  constructor() { super(null); }
  // implement findAll, findOne, create, update, patch, delete
}
```

Unimplemented operations throw `NotImplementedException` if the resource enables them.

### Enriching Prisma results

The extend pattern lets you decorate data from a Prisma database without a per-resource `repository.ts`:

```ts
export default class EnrichedAdapter extends PrismaDataSourceAdapter {
  constructor() { super(prisma); }

  override async findAll(model: string, params: ListRequest, ctx: AdapterCrudContext) {
    const result = await super.findAll(model, params, ctx);
    if (model === 'Annotation') {
      return { ...result, data: result.data.map(addPermissions) };
    }
    return result;
  }
}
```

### Hook context

Resource hooks and custom `repository.ts` files receive `ctx.dataSource: DataSourceAdapter`.
Use it instead of `ctx.prisma` — on a custom adapter `ctx.prisma` is `undefined`.

```ts
export const hooks = {
  beforeWrite: async (data, ctx) => {
    const { dataSource } = ctx; // DataSourceAdapter
    return data;
  },
};
```

### Limitations

- **Sub-resources** — implement `findAllByParent`, `findOneChild`, `createChild`, `updateChild`,
  `deleteChild` on the adapter; or expose each child collection as its own top-level resource.
- **Introspection** — `crouton update resources` skips datasources with `adapter: "custom"`.
- **Migrations** — a custom datasource owns its own schema lifecycle; crouton does not manage migrations for it.
