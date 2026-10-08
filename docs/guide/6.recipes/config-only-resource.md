---
description: Create a config-only resource (kind "custom") with a hand-written repository.ts for data access.
---

# Config-only resource (`kind: "custom"`)

Use a `kind: "custom"` resource when there is no Prisma model for the data — for example, a remote API, a computed view, or a per-resource query that is too project-specific for a shared adapter.

::: tip When NOT to use `kind: "custom"`
If your data comes from a non-Prisma backend that is shared across many resources, use a [custom-adapter datasource](../3.backend/data-sources.md#custom-adapter) instead. The adapter handles CRUD for all resources on that datasource; no per-resource `repository.ts` needed.

`kind: "custom"` is for per-resource data access, not per-datasource.
:::

## Files needed

```
resources/zotero_item/
├── resource.json     ← configures table, form, filters, sidebar, routes
└── repository.ts     ← your data access (auto-discovered by filename)
```

No `schema.ts` — the JSON model is built from the column `type`s declared in `resource.json`.

## Steps

### 1. Scaffold with the CLI

```sh
npx crouton create-resource zotero_item --title "Zotero items" --kind custom
```

Or create the files manually.

### 2. Write `resource.json`

Every column that is not a relation must declare a `type`. Omit `model` entirely — it is invalid on a custom resource.

```json
{
  "$schema": "https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json",
  "schemaVersion": 1,
  "kind": "custom",
  "name": "zotero_item",
  "route": "zotero-items",
  "title": "Zotero items",
  "operations": {
    "findAll": true,
    "findOne": true,
    "create": false,
    "update": false,
    "patch": false,
    "delete": false
  },
  "columns": {
    "id":    { "type": "string",  "idField": true, "hiddenInForm": true },
    "title": { "type": "string",  "searchable": true, "sortable": true, "defaultSort": true },
    "year":  { "type": "integer", "filterable": true },
    "url":   { "type": "string",  "hiddenInTable": true }
  }
}
```

Disable operations you do not implement (`create`, `update`, `patch`, `delete` above). Crouton validates that every enabled operation has a matching implementation in `repository.ts`.

### 3. Write `repository.ts`

```ts
import type { CustomRepository } from '@ghentcdh/crouton-api';

type ZoteroItem = { id: string; title: string; year: number; url: string };

const API = process.env.ZOTERO_API_URL ?? 'https://api.zotero.org';

const repository: CustomRepository<ZoteroItem> = {
  findAll: async (params, ctx) => {
    const res = await fetch(
      `${API}/items?limit=${params.pageSize}&start=${ctx.offset}`,
    );
    const body = await res.json();
    return { data: body.items, count: body.total };
  },

  findOne: async (id, ctx) => {
    const res = await fetch(`${API}/items/${id}`);
    if (res.status === 404) return null;
    return res.json();
  },
};

export default repository;
```

`findAll` must return `{ data, count }`. Return `null` from `findOne` to produce a 404.

### 4. Validate

```sh
npx crouton validate resources/zotero_item/resource.json
```

Crouton also checks at load time that every enabled operation is implemented. Problems appear on the [status page](../3.backend/status.md).

## Complete example with a Prisma mix-in

Custom resources can still use `ctx.prisma` to join local rows onto external data:

```ts
findAll: async (params, ctx) => {
  const remote = await fetchFromZotero(params);
  const local = await ctx.prisma.zoteroSync.findMany({
    where: { externalId: { in: remote.items.map((i) => i.key) } },
  });
  return { data: merge(remote.items, local), count: remote.total };
},
```

`ctx.prisma` is the resolved datasource client (set via `"database"` in `resource.json`). It is `undefined` when the project has no datasource.

## What crouton still does for you

Even with a custom repository, crouton keeps its usual guarantees:

- id coercion (numeric ids arrive as numbers)
- 404 routing (return `null`/`undefined` from `findOne`)
- `patch` falls back to `update` when not implemented
- hooks (`beforeWrite`, `afterWrite`, `afterRead`) in `hooks.ts` still apply
- request validation against the column-type schema
- enum value/label envelopes

See [Custom resources](../2.resources/custom-resource.md) for full reference including nesting and limitations.
