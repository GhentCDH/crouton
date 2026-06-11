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

```json
{
  "name": "maindb",
  "type": "prisma",
  "default": true
}
```

| Field | Description |
| --- | --- |
| `name` | Name used by resources to select this data source (`database` field in `resource.json`) |
| `type` | Client type — currently Prisma |
| `default` | Used by resources that don't specify a `database` |

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

Add one folder per database and reference them by name:

```
data-sources/
├── maindb/        # default: true
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

Resources without a `database` field use the data source marked `default: true`.
