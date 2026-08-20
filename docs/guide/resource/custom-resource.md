# Custom resources

A normal crouton resource is backed by a Prisma model: you point `resource.json`
at a model, add a `schema.ts`, and crouton generates the whole data access layer.

A **custom resource** keeps everything above that line — the table, form, view, filters, routes, sidebar entry, actions
and hooks — but hands data access to you. Set `"kind": "custom"` and implement the operations in a sibling
`repository.ts`.

Reach for it when the data does not live in your database, or does not live there in a shape a Prisma model describes:

- a third-party HTTP API (Zotero, a catalogue, an institutional repository);
- a search index you query rather than a table you select from;
- a computed or aggregated view stitched together from several sources;
- a legacy endpoint you want to expose through the same admin UI as everything else.

::: tip The API a custom resource serves is byte-for-byte the shape a prisma resource serves, so the frontend does not
know the difference. Nothing to configure on that side.
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
`operations`, `actions`, `tableActions`, `modalSize`, `include`. Three differences:

|               | prisma resource                   | custom resource              |
|---------------|-----------------------------------|------------------------------|
| `model`       | required                          | **must be omitted**          |
| `schema.ts`   | required                          | not used                     |
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

| Shorthand              | JSON Schema                                   |
|------------------------|-----------------------------------------------|
| `"string"`             | `{ "type": "string" }`                        |
| `"number"`             | `{ "type": "number" }`                        |
| `"integer"`            | `{ "type": "integer" }`                       |
| `"boolean"`            | `{ "type": "boolean" }`                       |
| `"date"`               | `{ "type": "string", "format": "date" }`      |
| `"date-time"`          | `{ "type": "string", "format": "date-time" }` |
| `"object"` / `"array"` | untyped object / array                        |

A fragment can nest arbitrarily (`properties`, `items`, `enum`, `format`,
`minimum`, …) and unknown keys pass through, so `x-*` extensions survive.

The shorthands work at any depth, not just at the column level — `"type": "date"`
inside a nested `properties` or `items` expands the same way:

```jsonc
"split": {
  "type": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "joinedOn": { "type": "date" },   // → { "type": "string", "format": "date" }
        "share":    { "type": "number" }
      }
    }
  }
}
```

The resource's json model is assembled from these: the column label becomes the property `title`,
`fieldInput.defaultValue` becomes `default`, and
`fieldInput.options.values` becomes `enum`. An object column with a `displayKey`
renders as a record cell in the table (showing that one key) and as a nested group of controls in the form.

Two columns are exempt from needing a `type`, because their shape lives in the resource they point at: relation columns
(`fieldInput.format: "relation"`) and autocomplete columns (`fieldInput.type: "autocomplete"`).

The form control follows from the type — the renderers test the resolved schema, so `"type": "number"` gets a number
input and `"type": "date"` a date picker with no `fieldInput` needed. Set `fieldInput.type` only to override that choice
(`textarea`, `markdown`, `select`, …).

### Required fields

A prisma resource derives `required` from its Zod model. A custom resource has no model, so mark the column:

```jsonc
"columns": {
  "label":  { "type": "string", "required": true },
  "amount": { "type": "number", "required": true },
  "note":   { "type": "string" }
}
```

This lands in the **form** schema's `required` array only — a required filter field would make the filter panel
unsubmittable, and the table and view schemas are read-only. It is ignored on the id column and on columns that are
neither
`createable` nor `updateable`, since the form cannot supply a value for those.

On a prisma resource the same flag overrides the model in either direction:
`true` requires a field the model left optional, `false` relaxes one the model made mandatory, and omitting it defers to
the model.

An **autocomplete** column carries no `type` — the shape of its `{ value, label }`
envelope depends on the widget's `storeValue` option — so `required: true` on one constrains its type to "anything but
null" rather than guessing that shape:

```jsonc
"paid_by": {
  "label": "Paid by",
  "displayKey": "name",
  "required": true,
  "fieldInput": { "type": "autocomplete", "options": { "uri": "/users?q={q}" } }
}
```

Declare the `type` yourself when you want the envelope validated properly:

```jsonc
"paid_by": {
  "required": true,
  "type": {
    "type": "object",
    "properties": { "id": { "type": "string" }, "name": { "type": "string" } },
    "required": ["id"]
  }
}
```

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

  create: async (data, ctx) => { /* ... */
  },
  update: async (id, data, ctx) => { /* ... */
  },
  delete: async (id, ctx) => { /* ... */
  },
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
  "data": [
    ...
  ],
  "request": {
    "count": 42,
    "page": 1,
    "pageSize": 20,
    "totalPages": 3,
    "sort": "title",
    "sortDir": "asc",
    "filter": []
  }
}
```

`params` is the parsed list request: `page`, `pageSize`, `sort`, `sortDir` and
`filter` — an array of raw `field:value:operator` strings. To reuse crouton's own grammar instead of parsing them
yourself:

```ts
import { parseFilterString } from '@ghentcdh/crouton-api';
```

Search from the table's search box arrives as a normal filter on the resource's lookup label column.

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

`ctx.prisma` means a custom resource can freely mix external data with your own tables — fetch from an API, then join
local rows onto the result:

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
- **`patch` falls back to `update`** when you do not implement it, matching the prisma repository where patch is an
  update with a partial schema;
- **hooks** — `beforeWrite` / `afterWrite` / `afterRead` in `hooks.ts` apply exactly as they do to a prisma resource;
- **value/label envelopes** for enum-backed columns;
- **request validation** against the form schema built from your column types.

## Validation

A custom resource is checked at load time, not on first request. Problems appear on
the [status page](../1.setup/status.md) and the resource is skipped rather than crashing the server:

- `model` present, or a column missing its `type`;
- `calculatedColumns` used — they run raw SQL against a real table, so compute the value in `findAll` instead;
- no `repository.ts`, or one that does not implement an operation
  `resource.json` enables. The message names the missing operations. Either implement them, or disable them:

  ```jsonc
  "operations": { "delete": false }
  ```

- a syntax error in `repository.ts` is reported as an import failure, so a broken file is distinguishable from a missing
  one.

The status page tags a custom resource with `custom` and how many operations its repository implements.

## Nesting under a parent

Two ways, depending on whether you want the child embedded in the parent's UI.

### As a sub-resource of a parent (embedded in the parent's detail view)

Put the child's directory inside the parent's, and declare it on the **parent**
with a relation column — the same way a prisma child is declared:

```
resources/groups/resource.json          # prisma; relation column → ./expense
resources/groups/expense/resource.json  # kind: custom
resources/groups/expense/repository.ts
```

```jsonc
// resources/groups/resource.json → columns
"expense": {
  "label": "Expenses",
  "hiddenInTable": true,
  "fieldInput": {
    "resource": "./expense/resource.json"
  }
}
```

`resource` is the whole declaration. `format: "relation"` is filled in when a column names a `resource` and sets neither
`format` nor `type`, and
`relationType` defaults to `oneToMany`. Spelling both out is harmless but adds nothing.

`foreignKey` is not needed either. It tells the *Prisma* child which column points back at the parent; a custom child
gets the parent id as the first argument to every operation and decides for itself what to do with it.

::: tip It is a route, not a database relation The parent's model needs no relation field of that name. The parent never
puts a custom child in a Prisma `_count`, `include`, or `select` — reads and writes go through the child's
`repository.ts` — so the column can be visible in the table without breaking the parent's list query.
:::

Routes are served by the **parent's** controller, so the child's table renders inside the group's detail view exactly as
a prisma child does:

|                                   |                           |
|-----------------------------------|---------------------------|
| `GET groups/expense/schemas`      | the child's view schemas  |
| `GET groups/:id/expense`          | list one group's expenses |
| `GET groups/:id/expense/:childId` | one expense               |
| `POST groups/:id/expense`         | create under that group   |

The data comes from the child's `repository.ts`, which implements the **parent-aware** operations:

```ts
const repository: CustomRepository<Expense> = {
  findAllByParent: async (groupId, params, ctx) => ({ data, count }),
  findOneByParent: async (groupId, id, ctx) => row ?? null,
  createByParent: async (groupId, data, ctx) => { ...
  },
  updateByParent: async (groupId, id, data, ctx) => { ...
  },
  deleteByParent: async (groupId, id, ctx) => { ...
  },
};
```

::: warning A nested child directory is **only** discovered through the parent's relation column. The loader scans one
level, so a `resource.json` in a subdirectory that nothing points at is ignored — no error, no status-page entry.

The reverse — a relation column pointing at a path with no `resource.json`, or one that does not parse — **is** reported
on the status page, naming the column and the paths that were tried. No sub-resource routes are registered for it.
:::

### As a standalone nested route (`parent`)

When you want a nested endpoint without involving the parent's config at all, declare the parent on the **child** and
keep it at the top level:

```jsonc
// resources/expense/resource.json
{
  "kind": "custom",
  "name": "expense",
  "route": "expense",
  "parent": { "route": "groups", "param": "groupId" }
}
```

The child's own controller mounts at `groups/:groupId/expense`, and it implements the same parent-aware operations. The
parent does not need to exist as a crouton resource.

Nesting this way is **exclusive**: no top-level route is registered, so the parent id is always in the path and a query
cannot accidentally run across every parent. Two consequences:

- the resource does not appear in the sidebar — a nav entry would resolve to
  `<name>/schemas`, which is not a route. Reach it from the parent's UI, or use the sub-resource form above.
- its `/schemas` URIs carry the parent as a placeholder (`/api/groups/{groupId}/expense`), so a caller substitutes a
  real id.

`parent.param` cannot be `"id"` — that is the child's own id in `/:id` routes. It defaults to `parentId`. `parent` is
only valid on a custom resource; a prisma resource is nested with a relation column instead.

::: danger The two forms are mutually exclusive Do not declare `parent` on the child *and* point a relation column at it
from the parent. Both register a handler for the same path — the parent's controller at
`groups/:id/expense`, the child's at `groups/:groupId/expense` — and whichever registers first wins, so requests land on
the wrong repository.

This is reported on the status page. Pick one: drop the `parent` block to embed the child in the parent's UI, or drop
the relation column to keep the child's own nested controller.
:::

## Current limitations

- **A custom resource cannot be a *parent* of sub-resources.** A custom *child*
  under a prisma parent works (see [Nesting](#nesting-under-a-parent)); the reverse does not. Relation columns on a
  custom resource still *render* — autocomplete against another resource works — but they register no child routes,
  because the parent has no model to hang them off. Expose that child as its own resource instead.
- **No `calculatedColumns`.** They are raw SQL against a table.
- **No `upsert`.** Not part of the repository contract.
- **`crouton update resources` skips custom resources.** They have no model to introspect, so the pipeline would
  otherwise offer to delete every column.
- **`relationType` is worth being explicit about** on a `manyToOne` relation column of a custom resource: there is no
  Zod model to infer cardinality from, and the default is `oneToMany`.

## See also

- [resource.json reference](resource-json.md)
- [Hooks](hooks.md) — apply to custom resources too
- [Actions](actions.md)
- [Datasources](../datasource/datasource.md)
