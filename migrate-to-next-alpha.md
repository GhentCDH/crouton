# Migration Guide — next-alpha

> **AI migration guide.** Give this file to an AI assistant (Claude, Cursor, etc.) along with each `resource.json` and ask it to apply all applicable transformations. The AI will check every rule below and rewrite only the sections that need updating.
>
> For agent file sync (Claude skill / Cursor rule / `AGENTS.md` block), run: `crouton migrate`

---

## How to use this guide with AI

Prompt template:
```
Read migrate-to-next-alpha.md and apply all applicable migrations to the resource.json below.
Output the full updated JSON.

<resource.json content>
```

The AI will apply every transformation whose trigger condition matches and output the corrected file. Review the diff before saving.

---

## `display` / `modalSize` → `layout.form.container` / `layout.view.container` (breaking)

**When to apply:** root-level `display` or `modalSize` key exists.

Root-level `display` and `modalSize` have moved into the layout object.

```json
// BEFORE
{
  "display": "modal",
  "modalSize": "lg"
}

// AFTER
{
  "layout": {
    "form": { "container": "modal", "containerSize": "lg" },
    "view": { "container": "modal", "containerSize": "lg" }
  }
}
```

**Rule:** Remove `display` and `modalSize` from root. Set `layout.form.container` and `layout.view.container` to the old `display` value, and `layout.form.containerSize` / `layout.view.containerSize` to the old `modalSize` value. Both form and view get the same values.

---

## `showInLookup` → `lookup.labels` (breaking)

**When to apply:** any column has `showInLookup: true`.

The column-level `showInLookup` flag is replaced by a resource-level `lookup.labels` array.

```json
// BEFORE
{
  "columns": {
    "firstName": { "showInLookup": true },
    "lastName":  { "showInLookup": true }
  }
}

// AFTER
{
  "lookup": {
    "labels": ["firstName", "lastName"],
    "separator": " "
  }
}
```

**Rule:** Collect all column ids where `showInLookup: true`. Remove `showInLookup` from those columns. Add `lookup.labels` as an array of those ids (in the order they appear in `columns`). Add `"separator": " "` as default. If `lookup` already exists, merge `labels` in.

---

## Root `include` → `operations.findAll.include` / `operations.findOne.include` (breaking)

**When to apply:** root-level `include` array exists.

Top-level `include` split by operation:

```json
// BEFORE
{
  "include": [
    "author",
    { "relation": "chapters", "orderBy": { "position": "asc" } }
  ]
}

// AFTER
{
  "operations": {
    "findAll": {
      "include": [
        "author",
        { "relation": "chapters", "orderBy": { "position": "asc" } }
      ]
    },
    "findOne": {
      "include": [
        "author",
        { "relation": "chapters", "orderBy": { "position": "asc" } }
      ]
    }
  }
}
```

**Rule:** Remove root `include`. Copy it to `operations.findAll.include` and `operations.findOne.include` (both get the same value). If `operations` already exists, merge in. When only `findAll.include` is set, `findOne` uses it as fallback — so setting both is safe and explicit.

---

## `model` / `table` / `database` / `idType` → `source.*` (breaking)

**When to apply:** root-level `model`, `table`, `database`, or `idType` key exists.

All datasource-identification fields have moved under a `source` object.

```json
// BEFORE
{
  "model": "Book",
  "table": "books",
  "database": "maindb",
  "idType": "number"
}

// AFTER
{
  "source": {
    "model": "Book",
    "table": "books",
    "database": "maindb",
    "idType": "number"
  }
}
```

**Rule:** Move `model`, `table`, `database`, `idType` from root into `source`. Omit any that are not present. If `source` already exists, merge in. Remove the root-level keys.

---

## `calculatedColumns` → `columns[id].computed` (breaking)

**When to apply:** root-level `calculatedColumns` array exists.

Top-level `calculatedColumns` array replaced by a `computed` field on the column definition.

```json
// BEFORE
{
  "calculatedColumns": [
    {
      "id": "chapter_count",
      "alias": "chapter_count",
      "label": "Chapters",
      "type": "number",
      "position": 5,
      "sqlExpression": "(SELECT count(*) FROM chapter c WHERE c.book_id = main.id)"
    }
  ]
}

// AFTER
{
  "columns": {
    "chapter_count": {
      "label": "Chapters",
      "position": 5,
      "computed": {
        "sql": "(SELECT count(*) FROM chapter c WHERE c.book_id = main.id)",
        "type": "number"
      }
    }
  }
}
```

**Rule:** For each entry in `calculatedColumns`: create or merge a column entry keyed by `id`. Move `label` and `position` to the column root. Move `sqlExpression` → `computed.sql` and `type` → `computed.type`. The `alias` field is dropped (redundant with `id`). Remove root `calculatedColumns` after processing all entries.

---

## `tag` → `openapi.tag` (breaking)

**When to apply:** root-level `tag` key exists and `openapi` does not exist.

```json
// BEFORE
{
  "tag": "Books"
}

// AFTER
{
  "openapi": {
    "tag": "Books"
  }
}
```

**Rule:** If `tag` exists at root and `openapi` does not, remove `tag` and add `openapi: { tag: <value> }`. If `openapi` already exists, leave the file unchanged (assume it was set intentionally).

---

## Redundant root `id` removal

**When to apply:** root-level `id` equals root-level `name`.

The `id` field is redundant when it equals `name` (the default).

```json
// BEFORE
{
  "name": "books",
  "id": "books"
}

// AFTER
{
  "name": "books"
}
```

**Rule:** If `id` exists at root and `id === name`, remove `id`. If `id !== name`, leave it (it is a meaningful override).

---

## Relation config: `fieldInput.*` → `relation.*` (breaking)

**When to apply:** any column's `fieldInput` has a `resource` key or `format: "relation"`.

Relation configuration has moved from `fieldInput` to a top-level `relation` field on the column.

```json
// BEFORE
{
  "columns": {
    "authorId": {
      "fieldInput": {
        "format": "relation",
        "resource": "authors",
        "relationType": "many-to-one",
        "foreignKey": "author_id",
        "relation": "author",
        "options": {
          "sort": "lastName",
          "sortDir": "asc",
          "displayKey": "fullName"
        }
      }
    }
  }
}

// AFTER
{
  "columns": {
    "authorId": {
      "displayKey": "fullName",
      "relation": {
        "resource": "authors",
        "type": "many-to-one",
        "foreignKey": "author_id",
        "prismaField": "author",
        "sort": "lastName",
        "sortDir": "asc"
      }
    }
  }
}
```

**Rule (per column):** If `fieldInput.resource` exists or `fieldInput.format === "relation"`, and `relation` is not yet set:
1. Build a `relation` object: `resource` from `fieldInput.resource`, `type` from `fieldInput.relationType`, `foreignKey` from `fieldInput.foreignKey`, `prismaField` from `fieldInput.relation`, `sort` from `fieldInput.options.sort`, `sortDir` from `fieldInput.options.sortDir`. Omit keys that are undefined.
2. Lift `fieldInput.options.displayKey` to the column root as `displayKey` (if not already there).
3. Remove from `fieldInput`: `resource`, `relationType`, `foreignKey`, `relation`, `format`. Remove from `fieldInput.options`: `sort`, `sortDir`, `resource`, `displayKey`.
4. If `fieldInput` has no remaining meaningful keys, delete it. Otherwise keep the remainder.
5. Add `relation` to the column root.

---

## Layout: `controls` → `items` (breaking, `schemaVersion` 1)

**When to apply:** any `layout` node (form, view, or table, or any nested node) has a `controls` key.

All layout nodes now use a single `items` list. The separate `controls` list is removed.

### Form / view layout

```json
// BEFORE
{
  "layout": {
    "form": {
      "type": "grid",
      "columns": 12,
      "controls": [
        { "id": "title", "colspan": 9 },
        { "id": "status", "colspan": 3 }
      ],
      "items": [
        {
          "type": "collapse",
          "title": "Meta",
          "controls": ["createdAt"]
        }
      ]
    }
  }
}

// AFTER
{
  "$schema": "https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json",
  "schemaVersion": 1,
  "layout": {
    "form": {
      "type": "grid",
      "columns": 12,
      "items": [
        { "id": "title", "colspan": 9 },
        { "id": "status", "colspan": 3 },
        {
          "type": "collapse",
          "title": "Meta",
          "items": ["createdAt"]
        }
      ]
    }
  }
}
```

**Rule:** Recursively, on every layout node: append all entries from `controls` to the end of `items` (or create `items` if absent), then delete `controls`. Rename nested `controls` → `items` the same way. Set `schemaVersion: 1` and `$schema` at root. Order is fully preserved — fields and containers render in `items` order.

### Table layout

```json
// BEFORE
{
  "layout": {
    "table": {
      "controls": ["title", "status", "createdAt"],
      "actions": [{ "id": "approve", "label": "Approve", "type": "post" }],
      "searchFields": ["title"],
      "filterFields": ["status"]
    }
  }
}

// AFTER
{
  "$schema": "https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json",
  "schemaVersion": 1,
  "operations": {
    "findAll": {
      "search": ["title"],
      "filter": ["status"]
    }
  },
  "layout": {
    "table": {
      "items": ["title", "status", "createdAt"],
      "rowActions": [{ "id": "approve", "label": "Approve", "type": "post" }]
    }
  }
}
```

See also: `actions` → `rowActions` and `searchFields`/`filterFields` → `operations.findAll` sections below.

---

## `actions` → `rowActions` (breaking)

**When to apply:** any table node or sub-resource has an `actions` key.

```json
// BEFORE
{ "layout": { "table": { "actions": [...] } } }

// AFTER
{ "layout": { "table": { "rowActions": [...] } } }
```

Sub-resources:
```json
// BEFORE
{ "subResources": [{ "childRoute": "chapters", "actions": [...] }] }

// AFTER
{ "subResources": [{ "childRoute": "chapters", "layout": { "table": { "rowActions": [...] } } }] }
```

**Rule:** Rename `actions` → `rowActions` on every table node and sub-resource. For sub-resources that have a bare `actions` at root (not inside `layout.table`), move it to `layout.table.rowActions`.

---

## `searchFields` / `filterFields` → `operations.findAll` (breaking)

**When to apply:** `layout.table.searchFields` or `layout.table.filterFields` exists (at any nesting level), or any column has `searchable: true`.

```json
// BEFORE
{
  "columns": { "title": { "searchable": true } },
  "layout": {
    "table": { "searchFields": ["body"], "filterFields": ["status"] }
  }
}

// AFTER
{
  "operations": {
    "findAll": { "search": ["title", "body"], "filter": ["status"] }
  },
  "layout": { "table": {} }
}
```

**Rule:** Collect all search fields from: (a) `layout.table.searchFields` (or recursively inside a wrapper table node), (b) column ids where `searchable: true`. Remove `searchable` from columns. Remove `searchFields` from layout. Set `operations.findAll.search` to the deduplicated union. Move `filterFields` → `operations.findAll.filter` the same way. Only apply if `operations.findAll.search` is not already set.

---

## Deprecated column fields: `fieldView`, `columnType` (removed)

**When to apply:** any column has a `fieldView` or `columnType` key.

These fields are silently deleted — they have no replacement (use `layout.view.items[].type/options` for per-column view overrides; use the column's top-level `type` instead of `columnType`).

```json
// BEFORE
{
  "columns": {
    "body": { "type": "text", "fieldView": { "type": "markdown" }, "columnType": "longtext" }
  }
}

// AFTER
{
  "columns": {
    "body": { "type": "text" }
  }
}
```

**Rule:** Remove `fieldView` and `columnType` from every column. No replacement value needed.

---

## Deprecated column fields: `sortable`, `searchable`, `filterable`, `showWhen`, `hideWhen`, `disabledWhen`, `fieldTable`

**When to apply:** any column has one of these keys at column level.

### `sortable` / `defaultSort`

```json
// BEFORE
{ "columns": { "title": { "sortable": true }, "createdAt": { "sortable": true, "defaultSort": true } } }

// AFTER
{ "layout": { "table": { "items": [{ "id": "title", "sortable": true }, { "id": "createdAt", "sortable": true, "defaultSort": true }] } } }
```

**Rule:** Move `sortable` and `defaultSort` from column to the matching `layout.table.items[]` entry (match by `id`). Create the entry if it doesn't exist.

### `filterable`

```json
// BEFORE
{ "columns": { "status": { "filterable": true } } }

// AFTER
{ "operations": { "findAll": { "filter": ["status"] } } }
```

**Rule:** Collect column ids where `filterable: true`. Remove `filterable` from those columns. Add to `operations.findAll.filter`.

### `showWhen` / `hideWhen` / `disabledWhen`

Move from the column to the matching item in `layout.table.items[]`, `layout.form.items[]`, or `layout.view.items[]` depending on context. For table context:

```json
// BEFORE
{ "columns": { "endDate": { "showWhen": { "field": "status", "eq": "active" } } } }

// AFTER
{ "layout": { "table": { "items": [{ "id": "endDate", "showWhen": { "field": "status", "eq": "active" } }] } } }
```

### `fieldTable`

```json
// BEFORE
{ "columns": { "status": { "fieldTable": { "type": "select", "options": { "values": [{ "value": "active", "label": "Active" }] } } } } }

// AFTER
{ "layout": { "table": { "items": [{ "id": "status", "type": "select", "options": { "values": [{ "value": "active", "label": "Active" }] } }] } } }
```

**Rule:** Move `fieldTable` content (its `type` and `options`) to the matching `layout.table.items[]` entry for that column id. Remove `fieldTable` from the column.

---

## Adding `$schema` to every `resource.json`

**When to apply:** root-level `$schema` is absent.

```json
{
  "$schema": "https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json"
}
```

Add as the first key in the file.

---

## Sub-resources

Sub-resource configs (inline children of a resource) also had a top-level `actions` field. Move it into `layout.table.rowActions`:

```json
// BEFORE
{ "subResources": [{ "childRoute": "chapters", "actions": [...] }] }

// AFTER
{ "subResources": [{ "childRoute": "chapters", "layout": { "table": { "rowActions": [...] } } }] }
```

---

## `/schemas` API response changes (v2)

> **This section affects custom frontends or integrations that consume the `/schemas` HTTP endpoint directly.**

| Old location                 | New location                             | Notes                           |
|------------------------------|------------------------------------------|---------------------------------|
| `schemas.table.actions`      | `schemas.table.ui.options.rowActions`    | was `actions`, now `rowActions` |
| `schemas.table.tableActions` | `schemas.table.ui.options.tableActions`  | name unchanged, location moved  |
| `schemas.table.defaultSort`  | `schemas.table.ui.options.defaultSortId` | renamed                         |
| `schemas.filter`             | `schemas.table.ui.options.filter`        | removed top-level key           |

---

## Automated detection — grep checklist

Run these from the repo root to find files needing migration:

```bash
# Relation keys
grep -rn '"fieldInput"' --include="resource.json" . | grep '"resource"'

# OpenAPI tag
grep -rn '"tag"' --include="resource.json" .

# Redundant id
grep -rn '"id"' --include="resource.json" .

# Layout v1 migration (controls → items, actions → rowActions)
grep -rn '"controls"' --include="resource.json" .
grep -rn '"actions"' --include="resource.json" .

# searchFields/filterFields moved to operations.findAll
grep -rn '"searchFields"' --include="resource.json" .
grep -rn '"filterFields"' --include="resource.json" .

# Deprecated column-level fields
grep -rn '"sortable"' --include="resource.json" .
grep -rn '"defaultSort"' --include="resource.json" .
grep -rn '"searchable"' --include="resource.json" .
grep -rn '"filterable"' --include="resource.json" .
grep -rn '"showWhen"' --include="resource.json" .
grep -rn '"hideWhen"' --include="resource.json" .
grep -rn '"disabledWhen"' --include="resource.json" .
grep -rn '"fieldTable"' --include="resource.json" .
grep -rn '"fieldView"' --include="resource.json" .
grep -rn '"columnType"' --include="resource.json" .

# Source fields
grep -rn '"model"' --include="resource.json" .
grep -rn '"idType"' --include="resource.json" .

# calculatedColumns
grep -rn '"calculatedColumns"' --include="resource.json" .

# showInLookup
grep -rn '"showInLookup"' --include="resource.json" .
```

---

## Common mistakes

- **`controls` instead of `items`**: `"controls": [...]` fails validation with a migration hint.
- **`actions` instead of `rowActions`**: `"actions": [...]` on a table node fails validation. Rename to `rowActions`.
- **Table settings on the wrapper, not the table node**: in a wrapper layout, `rowActions`, `tableActions`, `searchFields`, `filterFields` must go on the `{ "type": "table", ... }` node, not the outer grid.
- **Field ids directly in a wrapper node**: field ids (strings or `{ id }` objects) are only valid inside the table node's `items`.
- **`sortable` on the column, not the item**: still validates (backward compat) but won't get autocomplete. Move to `layout.table.items[].sortable`.
- **`$schema` path wrong**: it's `https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json` — an absolute URL, not a relative path.
- **`fieldTable` with a full fieldInput shape**: only `type` and `options` are valid on a table layout item.
- **`searchFields`/`filterFields` in `layout.table`**: removed — move to `operations.findAll.search` / `operations.findAll.filter`.
