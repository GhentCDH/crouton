# Custom resources

A normal crouton resource is backed by a Prisma model: you point `resource.json`
at a model, add a `schema.ts`, and crouton generates the whole data access layer.

A **custom resource** keeps everything above that line — the table, form, view,
filters, routes, sidebar entry, actions and hooks — but hands data access to you.
Set `"kind": "custom"` and implement the operations in a sibling
`repository.ts`.

Reach for it when the data does not live in your database, or does not live
there in a shape a Prisma model describes:

- a third-party HTTP API (Zotero, a catalogue, an institutional repository);
- a search index you query rather than a table you select from;
- a computed or aggregated view stitched together from several sources;
- a legacy endpoint you want to expose through the same admin UI as everything
  else.

::: tip
The API a custom resource serves is byte-for-byte the shape a prisma resource
serves, so the frontend does not know the difference. Nothing to configure on
that side.
:::

## Scaffold one

```bash
npx crouton create-resource zotero_item
```

That writes two files and never overwrites an existing one:

```
resources/zotero_item/
├── resource.json     # configures the form / table / view / filters
└── repository.ts     # ← your data access
```

Useful flags: `--route`, `--tag`, `--title`, `--database`, `--id-type`,
`--dry-run`, `-y`.

## resource.json

Everything a prisma resource supports still applies — `sidebar`, `display`,
`operations`, `actions`, `tableActions`, `modalSize`, `include`. Three
differences:

| | prisma resource | custom resource |
| --- | --- | --- |
| `model` | required | **must be omitted** |
| `schema.ts` | required | not used |
| column `type` | optional (derived from the model) | **required on every column** |

```jsonc
{
  "$schema": "https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json",
  "schemaVersion": 1,
  "kind": "custom",

  "name": "zotero_item",
  "route": "zotero-items",
  "tag": "Zotero",
  "title": "Zotero items",

  // Optional. Selects which datasource client is handed to the repository as
  // ctx.prisma. Omitted ⇒ the project default. A project of only custom
  // resources needs no datasource at all.
  "database": "maindb",

  "idType": "string",

  // Disable anything you do not implement — see "Validation" below.
  "operations": {
    "findAll": true, "findOne": true,
    "create": true, "update": true, "patch": true,
    "delete": false
  },

  "columns": {
    "id":    { "type": "string", "idField": true, "hiddenInForm": true },
    "title": { "type": "string", "searchable": true, "sortable": true, "defaultSort": true },
    "year":  { "type": "integer", "filterable": true },
    "public": { "type": "boolean" },

    // A full JSON Schema fragment, for nested data
    "metadata": {
      "displayKey": "name",
      "type": {
        "type": "object",
        "properties": {
          "id":   { "type": "string" },
          "name": { "type": "string" }
        }
      }
    },

    "tags": {
      "type": { "type": "array", "items": { "type": "string" } },
      "hiddenInTable": true
    }
  }
}
```

### Column types

`type` is either a shorthand string or a JSON Schema fragment:

| Shorthand | JSON Schema |
| --- | --- |
| `"string"` | `{ "type": "string" }` |
| `"number"` | `{ "type": "number" }` |
| `"integer"` | `{ "type": "integer" }` |
| `"boolean"` | `{ "type": "boolean" }` |
| `"date"` | `{ "type": "string", "format": "date" }` |
| `"date-time"` | `{ "type": "string", "format": "date-time" }` |
| `"object"` / `"array"` | untyped object / array |

A fragment can nest arbitrarily (`properties`, `items`, `enum`, `format`,
`minimum`, …) and unknown keys pass through, so `x-*` extensions survive.

The resource's json model is assembled from these: the column label becomes the
property `title`, `fieldInput.defaultValue` becomes `default`, and
`fieldInput.options.values` becomes `enum`. An object column with a `displayKey`
renders as a record cell in the table (showing that one key) and as a nested
group of controls in the form.

Two columns are exempt from needing a `type`, because their shape lives in the
resource they point at: relation columns (`fieldInput.format: "relation"`) and
autocomplete columns (`fieldInput.type: "autocomplete"`).

## repository.ts

```ts
import type { CustomRepository } from '@ghentcdh/crouton-api';
import type { PrismaClient } from '@np/generated/client';

type ZoteroItem = { id: string; title: string; year: number };

const repository: CustomRepository<ZoteroItem, PrismaClient> = {
  findAll: async (params, ctx) => {
    const res = await fetch(
      `${API}/items?limit=${params.pageSize}&start=${ctx.offset}`,
    );
    const body = await res.json();
    return { data: body.items, count: body.total };
  },

  findOne: async (id, ctx) => {
    const res = await fetch(`${API}/items/${id}`);
    if (res.status === 404) return null; // → 404 from crouton
    return res.json();
  },

  create: async (data, ctx) => { /* ... */ },
  update: async (id, data, ctx) => { /* ... */ },
  delete: async (id, ctx) => { /* ... */ },
};

export default repository;
```

Discovery is by convention, exactly like `hooks.ts`: the file must be called
`repository.ts` (or `.js`) and default-export the object. No declaration in
`resource.json`.

### `findAll` returns `{ data, count }`

Not just rows. The framework builds the standard list envelope from it:

```json
{
  "data": [ ... ],
  "request": { "count": 42, "page": 1, "pageSize": 20, "totalPages": 3,
               "sort": "title", "sortDir": "asc", "filter": [] }
}
```

`params` is the parsed list request: `page`, `pageSize`, `sort`, `sortDir` and
`filter` — an array of raw `field:value:operator` strings. To reuse crouton's
own grammar instead of parsing them yourself:

```ts
import { parseFilterString } from '@ghentcdh/crouton-api';
```

Search from the table's search box arrives as a normal filter on the resource's
lookup label column.

### The context object

```ts
{
  prisma,       // resolved datasource client — undefined if the project has none
  dataSources,  // { resolve(name?), entries() } for multi-database resources
  config,       // the resolved resource config
  op,           // 'findAll' | 'findOne' | 'create' | 'update' | 'patch' | 'delete'
  offset,       // zero-based row offset derived from page/pageSize
  id,           // record id, on the operations that address one
}
```

`ctx.prisma` means a custom resource can freely mix external data with your own
tables — fetch from an API, then join local rows onto the result:

```ts
findAll: async (params, ctx) => {
  const remote = await fetchItems(params);
  const local = await ctx.prisma.zoteroSync.findMany({
    where: { externalId: { in: remote.items.map((i) => i.key) } },
  });
  return { data: merge(remote.items, local), count: remote.total };
},
```

### What crouton still does for you

You implement the fetch; the framework keeps its usual guarantees:

- **id coercion** per `idType`, so a numeric key arrives as a number;
- **404s** — return `null`/`undefined` from `findOne` rather than throwing;
- **`patch` falls back to `update`** when you do not implement it, matching the
  prisma repository where patch is an update with a partial schema;
- **hooks** — `beforeWrite` / `afterWrite` / `afterRead` in `hooks.ts` apply
  exactly as they do to a prisma resource;
- **value/label envelopes** for enum-backed columns;
- **request validation** against the form schema built from your column types.

## Validation

A custom resource is checked at load time, not on first request. Problems appear
on the [status page](./status.md) and the resource is skipped rather than
crashing the server:

- `model` present, or a column missing its `type`;
- `calculatedColumns` used — they run raw SQL against a real table, so compute
  the value in `findAll` instead;
- no `repository.ts`, or one that does not implement an operation
  `resource.json` enables. The message names the missing operations. Either
  implement them, or disable them:

  ```jsonc
  "operations": { "delete": false }
  ```

- a syntax error in `repository.ts` is reported as an import failure, so a
  broken file is distinguishable from a missing one.

The status page tags a custom resource with `custom` and how many operations its
repository implements.

## Current limitations

- **No nested sub-resource routes.** Child collections
  (`GET /parent/:id/children`) are derived from Prisma relations. Relation
  columns still *render* — autocomplete against another resource works — but a
  child collection managed inline from a custom parent does not. Expose the
  child as its own resource instead.
- **No `calculatedColumns`.** They are raw SQL against a table.
- **No `upsert`.** Not part of the repository contract.
- **`crouton update resources` skips custom resources.** They have no model to
  introspect, so the pipeline would otherwise offer to delete every column.
- **`relationType` must be explicit** on relation columns — there is no Zod
  model to infer cardinality from.

## See also

- [resource.json reference](./resource-json.md)
- [Hooks](./hooks.md) — apply to custom resources too
- [Actions](./actions.md)
- [Datasources](./datasource.md)
