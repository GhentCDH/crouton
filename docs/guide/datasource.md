# Data sources

A data source is a named database client that resources read from and write to. Data sources live in their own directory, passed as the second argument to `CroutonApiModule.forResourceDir`.

## Folder convention

```
data-sources/
└── maindb/
    ├── data-source.json
    └── index.ts
```

## data-source.json

Every datasource is **self-describing**: a single `data-source.json` holds both what the runtime needs to connect and what the [CLI / codegen](./cli.md) needs to introspect and generate.

```json
{
  "type": "postgres",
  "name": "maindb",
  "default": true,
  "prismaSchema": "prisma/maindb/schema.prisma",
  "urlEnv": "DATABASE_URL",
  "generatedTypesImport": "@my-app/generated/maindb",
  "zodOutput": "generated/maindb/src",
  "prismaConfig": "prisma/maindb/prisma.config.ts"
}
```

### Runtime fields

These are read by `crouton-api` at startup:

| Field | Description |
| --- | --- |
| `name` | Name used by resources to select this data source (the `database` field in `resource.json`). Defaults to the folder name. |
| `type` | Client type — currently Prisma. |
| `default` | Used by resources that don't specify a `database`. Exactly one datasource may be `default`. |

### Codegen fields

These are read only by the `crouton` CLI / codegen engine; the runtime ignores them. They make multiple datasources possible by giving each its own schema and generated outputs.

| Field | Description |
| --- | --- |
| `prismaSchema` | Path to this datasource's Prisma schema, relative to the project root. |
| `urlEnv` | Env var holding the connection URL used when the CLI runs `prisma db pull` / `generate`. |
| `generatedTypesImport` | Import path for this datasource's generated Zod types. New `schema.ts` files re-export from here. |
| `zodOutput` | This datasource's `zod-prisma-types` output dir (project-relative). |
| `prismaConfig` | Prisma config file for this datasource. Defaults to `prisma/<name>/prisma.config.ts`. |

## index.ts

Default-export a configured `PrismaClient`:

```ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const client = new PrismaClient({ adapter });

export default client;
```

## Multiple databases

Add one folder per database and reference them by name. Each datasource owns a **separate Prisma schema and generated output** so the generated clients and Zod types never collide:

```
prisma/
├── maindb/
│   ├── schema.prisma       # generator output → generated/maindb
│   └── prisma.config.ts    # binds maindb's urlEnv
└── archivedb/
    ├── schema.prisma       # generator output → generated/archivedb
    └── prisma.config.ts

generated/
├── maindb/                 # zodOutput for maindb
└── archivedb/

data-sources/
├── maindb/                 # default: true
└── archivedb/
```

```json
// resources/legacy_record/resource.json
{
  "name": "legacy_record",
  "database": "archivedb",
  ...
}
```

Resources without a `database` field use the data source marked `default: true`. A single datasource can keep flat paths (e.g. `prisma/schema.prisma`, `generated/types`) — the per-`<name>` layout above only becomes necessary once a second datasource is added.

The CLI **discovers** datasources by scanning the data-sources directory (set in [`crouton.json`](./cli.md)); they are not listed anywhere else.
