# Migration Guide — next-alpha: layout.table consolidation

## Summary

All table-specific configuration has moved from column-level flags and resource-level arrays into `layout.table`. The column schema no longer accepts `sortable`, `defaultSort`, `searchable`, `filterable`, `showWhen`, `hideWhen`, `disabledWhen`, or `fieldTable`. The resource root no longer accepts `actions` or `tableActions`. Everything now lives under `layout.table` where it belongs structurally. A backward-compat transform is applied at parse time so existing files still load, but editor autocomplete will flag these as unknown fields — migrate now.

---

## Deprecated column fields

### `sortable` / `defaultSort`

```json
// BEFORE (deprecated)
{
  "columns": {
    "title": { "sortable": true },
    "createdAt": { "sortable": true, "defaultSort": true }
  }
}

// AFTER
{
  "layout": {
    "table": {
      "controls": [
        { "id": "title", "sortable": true },
        { "id": "createdAt", "sortable": true, "defaultSort": true }
      ]
    }
  }
}
```

Move both flags to `layout.table.controls[]` entries for the same column id.

### `searchable`

```json
// BEFORE (deprecated)
{
  "columns": {
    "title": { "searchable": true },
    "authorId": { "searchable": true }
  }
}

// AFTER
{
  "layout": {
    "table": {
      "searchFields": ["title", "authorId"]
    }
  }
}
```

`searchFields` is a flat array of column ids. Relation columns still automatically resolve to their display field.

### `filterable`

```json
// BEFORE (deprecated)
{
  "columns": {
    "status": { "filterable": true },
    "category": { "filterable": true }
  }
}

// AFTER
{
  "layout": {
    "table": {
      "filterFields": ["status", "category"]
    }
  }
}
```

### `showWhen` / `hideWhen` / `disabledWhen`

```json
// BEFORE (deprecated)
{
  "columns": {
    "endDate": {
      "showWhen": { "field": "status", "eq": "active" }
    },
    "reason": {
      "hideWhen": { "field": "status", "eq": "active" }
    },
    "approvedBy": {
      "disabledWhen": { "field": "role", "neq": "admin" }
    }
  }
}

// AFTER
{
  "layout": {
    "table": {
      "controls": [
        { "id": "endDate", "showWhen": { "field": "status", "eq": "active" } },
        { "id": "reason", "hideWhen": { "field": "status", "eq": "active" } },
        { "id": "approvedBy", "disabledWhen": { "field": "role", "neq": "admin" } }
      ]
    }
  }
}
```

Same condition shape (`field`, `eq`, `neq`, `exists`, `notExists`) — just moved to the layout control entry.

For **form/view** conditional visibility, use the same `showWhen`/`hideWhen`/`disabledWhen` fields on controls inside `layout.form` or `layout.view`.

### `fieldTable`

```json
// BEFORE (deprecated)
{
  "columns": {
    "status": {
      "fieldTable": {
        "type": "select",
        "options": { "values": [{ "value": "active", "label": "Active" }] }
      }
    }
  }
}

// AFTER
{
  "layout": {
    "table": {
      "controls": [
        {
          "id": "status",
          "type": "select",
          "options": { "values": [{ "value": "active", "label": "Active" }] }
        }
      ]
    }
  }
}
```

Use `type` and `options` directly on the table layout control. Same semantics: overrides the cell renderer for this column in the table context only.

---

## Deprecated resource-level fields

### `actions` / `tableActions`

```json
// BEFORE (deprecated)
{
  "actions": [
    { "id": "approve", "label": "Approve", "type": "post" }
  ],
  "tableActions": [
    { "id": "export", "label": "Export CSV", "type": "post" }
  ]
}

// AFTER
{
  "layout": {
    "table": {
      "actions": [
        { "id": "approve", "label": "Approve", "type": "post" }
      ],
      "tableActions": [
        { "id": "export", "label": "Export CSV", "type": "post" }
      ]
    }
  }
}
```

In `resource.json`: `actions` = per-record row actions, `tableActions` = global toolbar buttons with no record id.

---

## `/schemas` API response changes

> **This section affects custom frontends or integrations that consume the `/schemas` HTTP endpoint directly.** The `resource.json` format above is unchanged; only the compiled response shape changed.

The compiled `schemas.table.ui` is now a self-contained `Table` UI node. All table-level metadata has moved into `schemas.table.ui.options`:

| Old location | New location | Rename |
|---|---|---|
| `schemas.table.actions` | `schemas.table.ui.options.rowActions` | `actions` → `rowActions` |
| `schemas.table.tableActions` | `schemas.table.ui.options.actions` | `tableActions` → `actions` |
| `schemas.table.defaultSort` | `schemas.table.ui.options.defaultSortId` | `defaultSort` → `defaultSortId` |
| `schemas.filter` | `schemas.table.ui.options.filter` | (removed top-level key) |

The `filter` entry at `schemas.table.ui.options.filter` has the shape:

```json
{
  "schema": { /* JSON Schema */ },
  "uischema": { /* UI schema */ },
  "initialData": {}
}
```

Example compiled table UI:

```json
{
  "type": "Table",
  "options": {
    "defaultSortId": "createdAt",
    "actions": [{ "id": "export", "label": "Export CSV", ... }],
    "rowActions": [{ "id": "approve", "label": "Approve", ... }],
    "filter": {
      "schema": { ... },
      "uischema": { ... },
      "initialData": {}
    }
  },
  "elements": [...]
}
```

For wrapper layouts (`layout.table` with an outer type), the `Table` node is nested inside the outer element and the same `options` structure applies to the inner `Table` element.

---

## Adding `$schema` to every `resource.json`

```json
{
  "$schema": "../../crouton.schema.json"
}
```

The relative path is from the `resource.json` to the generated `crouton.schema.json` at the project root. Adjust depth:

- `src/resources/book/resource.json` → `"$schema": "../../../crouton.schema.json"`
- `resources/book/resource.json` → `"$schema": "../../crouton.schema.json"`

---

## Sub-resources

Sub-resource configs (inline children of a resource) also had a top-level `actions` field. Move it the same way:

```json
// BEFORE
{
  "subResources": [{ "childRoute": "chapters", "actions": [...] }]
}

// AFTER
{
  "subResources": [{ "childRoute": "chapters", "layout": { "table": { "actions": [...] } } }]
}
```

---

## Automated detection — grep checklist

Run these from the repo root to find files needing migration:

```bash
# Deprecated column-level fields
grep -rn '"sortable"' --include="resource.json" .
grep -rn '"defaultSort"' --include="resource.json" .
grep -rn '"searchable"' --include="resource.json" .
grep -rn '"filterable"' --include="resource.json" .
grep -rn '"showWhen"' --include="resource.json" .
grep -rn '"hideWhen"' --include="resource.json" .
grep -rn '"disabledWhen"' --include="resource.json" .
grep -rn '"fieldTable"' --include="resource.json" .

# Deprecated resource-level fields (check they are NOT inside layout.table)
grep -rn '"actions"' --include="resource.json" .
grep -rn '"tableActions"' --include="resource.json" .
```

For `actions`/`tableActions`, check whether the match is at the root level or inside `layout.table` — only root-level is deprecated.

---

## Common mistakes

- **`sortable` on the column, not the control**: `"columns": { "title": { "sortable": true } }` still validates (backward compat shim) but won't get autocomplete. Move it to `layout.table.controls[].sortable`.
- **`$schema` path wrong**: it's relative to the `resource.json` file, not the project root. Go up one extra `../` per directory level.
- **`fieldTable` with a full fieldInput shape**: only `type` and `options` are valid on a table layout control, not the full `fieldInput` shape (`format`, `relationType`, etc.).
- **Missing `controls` entry for sortable column**: if the column is not listed in `layout.table.controls`, add a minimal entry `{ "id": "colId", "sortable": true }` — columns not in `controls` appear after listed ones in their original order.
- **Forgetting `filterFields` defaults to `[]`**: without any `filterFields`, the filter view is empty. Previously this was driven by `filterable: true` on each column.
