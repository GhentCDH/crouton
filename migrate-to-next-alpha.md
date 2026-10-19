# Migration Guide — next-alpha

> **Run `crouton migrate`.** It migrates your `resource.json` files and refreshes the crouton skill / Cursor rule / `AGENTS.md` block.

---

## `display` / `modalSize` → `layout.form.container` / `layout.view.container` (breaking)

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

Run `crouton migrate` to apply automatically.

---

## `showInLookup` → `lookup.labels` (breaking)

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

Run `crouton migrate` to apply automatically.

---

## Root `include` → `operations.findAll.include` / `operations.findOne.include` (breaking)

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

Run `crouton migrate` to apply automatically. When only `findAll.include` is set, `findOne` uses it as fallback.

---

## `model` / `table` / `database` / `idType` → `source.*` (breaking)

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

Run `crouton migrate` to apply automatically.

---

## `calculatedColumns` → `columns[id].computed` (breaking)

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

Run `crouton migrate` to apply automatically.

---

## Layout: `controls` → `items` (breaking, `schemaVersion` 1)

All layout nodes now use a single `items` list. The separate `controls` list is removed. Run the codemod to migrate
automatically:

```bash
crouton migrate layout --dry-run   # preview changes
crouton migrate layout              # apply
```

Or use `--check` in CI to fail if any file needs migration:

```bash
crouton migrate layout --check
```

### BEFORE / AFTER — form layout

```json
// BEFORE
{
  "layout": {
    "form": {
      "type": "grid",
      "columns": 12,
      "controls": [
        {
          "id": "title",
          "colspan": 9
        },
        {
          "id": "status",
          "colspan": 3
        }
      ],
      "items": [
        {
          "type": "collapse",
          "title": "Meta",
          "controls": [
            "createdAt"
          ]
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
        {
          "id": "title",
          "colspan": 9
        },
        {
          "id": "status",
          "colspan": 3
        },
        {
          "type": "collapse",
          "title": "Meta",
          "items": [
            "createdAt"
          ]
        }
      ]
    }
  }
}
```

Order is now fully preserved — fields and nested containers render in the order they appear in `items`.

### BEFORE / AFTER — flat table

```json
// BEFORE
{
  "layout": {
    "table": {
      "controls": [
        {
          "id": "title",
          "sortable": true
        },
        "status",
        "createdAt"
      ],
      "actions": [
        {
          "id": "approve",
          "label": "Approve",
          "type": "post"
        }
      ],
      "tableActions": [
        {
          "id": "export",
          "label": "Export",
          "type": "post"
        }
      ],
      "searchFields": [
        "title"
      ],
      "filterFields": [
        "status"
      ]
    }
  }
}

// AFTER
{
  "$schema": "https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json",
  "schemaVersion": 1,
  "operations": {
    "findAll": {
      "search": [
        "title"
      ],
      "filter": [
        "status"
      ]
    }
  },
  "layout": {
    "table": {
      "items": [
        {
          "id": "title",
          "sortable": true
        },
        "status",
        "createdAt"
      ],
      "rowActions": [
        {
          "id": "approve",
          "label": "Approve",
          "type": "post"
        }
      ],
      "tableActions": [
        {
          "id": "export",
          "label": "Export",
          "type": "post"
        }
      ]
    }
  }
}
```

### BEFORE / AFTER — wrapper table

```json
// BEFORE
{
  "layout": {
    "table": {
      "type": "grid",
      "columns": 12,
      "controls": [
        {
          "component": "CreateByIsbn"
        }
      ],
      "items": [
        {
          "type": "table",
          "controls": [
            "title",
            "author",
            "isbn"
          ]
        }
      ],
      "actions": [
        {
          "id": "open",
          "type": "link",
          "href": "/isbn/{isbn}",
          "label": "Open"
        }
      ],
      "searchFields": [
        "title",
        "isbn"
      ]
    }
  }
}

// AFTER
{
  "$schema": "https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json",
  "schemaVersion": 1,
  "operations": {
    "findAll": {
      "search": [
        "title",
        "isbn"
      ]
    }
  },
  "layout": {
    "table": {
      "type": "grid",
      "columns": 12,
      "items": [
        {
          "component": "CreateByIsbn"
        },
        {
          "type": "table",
          "items": [
            "title",
            "author",
            "isbn"
          ],
          "rowActions": [
            {
              "id": "open",
              "type": "link",
              "href": "/isbn/{isbn}",
              "label": "Open"
            }
          ]
        }
      ]
    }
  }
}
```

All table settings (`rowActions`, `tableActions`, `title`) now go on the **table node** (`type: "table"`), not the outer
wrapper. Search and filter fields move to `operations.findAll`.

---

## `actions` → `rowActions` (breaking)

The `actions` key on a table node or sub-resource is renamed to `rowActions`. The codemod handles this automatically.

```json
// BEFORE
{
  "layout": {
    "table": {
      "actions": [
        ...
      ]
    }
  }
}

// AFTER
{
  "layout": {
    "table": {
      "rowActions": [
        ...
      ]
    }
  }
}
```

Sub-resources:

```json
// BEFORE
{
  "subResources": [
    {
      "childRoute": "chapters",
      "layout": {
        "table": {
          "actions": [
            ...
          ]
        }
      }
    }
  ]
}

// AFTER
{
  "subResources": [
    {
      "childRoute": "chapters",
      "layout": {
        "table": {
          "rowActions": [
            ...
          ]
        }
      }
    }
  ]
}
```

---

## `searchFields` / `filterFields` → `operations.findAll` (breaking)

`layout.table.searchFields` and `layout.table.filterFields` are removed. Move them to `operations.findAll`:

```json
// BEFORE
{
  "operations": {
    "findAll": true
  },
  "layout": {
    "table": {
      "searchFields": [
        "title",
        "author"
      ],
      "filterFields": [
        "status"
      ]
    }
  }
}

// AFTER
{
  "operations": {
    "findAll": {
      "search": [
        "title",
        "author"
      ],
      "filter": [
        "status"
      ]
    }
  },
  "layout": {
    "table": {}
  }
}
```

When `findAll: true` (no explicit `search`), crouton searches all non-id, non-relation, non-date columns automatically.
Only declare `search` to restrict which fields are searched.

---

## `/schemas` API response changes (v2)

> **This section affects custom frontends or integrations that consume the `/schemas` HTTP endpoint directly.**

| Old location                 | New location                             | Notes                           |
|------------------------------|------------------------------------------|---------------------------------|
| `schemas.table.actions`      | `schemas.table.ui.options.rowActions`    | was `actions`, now `rowActions` |
| `schemas.table.tableActions` | `schemas.table.ui.options.tableActions`  | name unchanged, location moved  |
| `schemas.table.defaultSort`  | `schemas.table.ui.options.defaultSortId` | renamed                         |
| `schemas.filter`             | `schemas.table.ui.options.filter`        | removed top-level key           |

The `Table.options` shape:

```json
{
  "type": "Table",
  "options": {
    "defaultSortId": "createdAt",
    "title": "Books",
    "rowActions": [
      {
        "id": "approve",
        "label": "Approve",
        ...
      }
    ],
    "tableActions": [
      {
        "id": "export",
        "label": "Export CSV",
        ...
      }
    ],
    "filter": {
      "schema": {
        ...
      },
      "uischema": {
        ...
      },
      "initialData": {}
    }
  },
  "elements": [
    ...
  ]
}
```

For wrapper layouts the `Table` node is nested inside the outer element tree at its declared position. Components and
wrapper containers appear as sibling elements before/after it.

---

## Previous breaking change: `layout.table` consolidation

All table-specific configuration has moved from column-level flags and resource-level arrays into `layout.table`. The
column schema no longer accepts `sortable`, `defaultSort`, `searchable`, `filterable`, `showWhen`, `hideWhen`,
`disabledWhen`, or `fieldTable`. The resource root no longer accepts `actions` or `tableActions`. Everything now lives
under `layout.table` where it belongs structurally.

---

## Deprecated column fields

### `sortable` / `defaultSort`

```json
// BEFORE (deprecated)
{
  "columns": {
    "title": {
      "sortable": true
    },
    "createdAt": {
      "sortable": true,
      "defaultSort": true
    }
  }
}

// AFTER
{
  "layout": {
    "table": {
      "items": [
        {
          "id": "title",
          "sortable": true
        },
        {
          "id": "createdAt",
          "sortable": true,
          "defaultSort": true
        }
      ]
    }
  }
}
```

Move both flags to `layout.table.items[]` entries for the same column id.

### `searchable`

```json
// BEFORE (deprecated)
{
  "columns": {
    "title": {
      "searchable": true
    },
    "authorId": {
      "searchable": true
    }
  }
}

// AFTER
{
  "operations": {
    "findAll": {
      "search": [
        "title",
        "authorId"
      ]
    }
  }
}
```

### `filterable`

```json
// BEFORE (deprecated)
{
  "columns": {
    "status": {
      "filterable": true
    },
    "category": {
      "filterable": true
    }
  }
}

// AFTER
{
  "operations": {
    "findAll": {
      "filter": [
        "status",
        "category"
      ]
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
      "showWhen": {
        "field": "status",
        "eq": "active"
      }
    },
    "reason": {
      "hideWhen": {
        "field": "status",
        "eq": "active"
      }
    },
    "approvedBy": {
      "disabledWhen": {
        "field": "role",
        "neq": "admin"
      }
    }
  }
}

// AFTER
{
  "layout": {
    "table": {
      "items": [
        {
          "id": "endDate",
          "showWhen": {
            "field": "status",
            "eq": "active"
          }
        },
        {
          "id": "reason",
          "hideWhen": {
            "field": "status",
            "eq": "active"
          }
        },
        {
          "id": "approvedBy",
          "disabledWhen": {
            "field": "role",
            "neq": "admin"
          }
        }
      ]
    }
  }
}
```

For **form/view** conditional visibility, use the same fields on items inside `layout.form` or `layout.view`.

### `fieldTable`

```json
// BEFORE (deprecated)
{
  "columns": {
    "status": {
      "fieldTable": {
        "type": "select",
        "options": {
          "values": [
            {
              "value": "active",
              "label": "Active"
            }
          ]
        }
      }
    }
  }
}

// AFTER
{
  "layout": {
    "table": {
      "items": [
        {
          "id": "status",
          "type": "select",
          "options": {
            "values": [
              {
                "value": "active",
                "label": "Active"
              }
            ]
          }
        }
      ]
    }
  }
}
```

---

## Adding `$schema` to every `resource.json`

```json
{
  "$schema": "https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json"
}
```

---

## Sub-resources

Sub-resource configs (inline children of a resource) also had a top-level `actions` field. Move it into
`layout.table.rowActions`:

```json
// BEFORE
{
  "subResources": [
    {
      "childRoute": "chapters",
      "actions": [
        ...
      ]
    }
  ]
}

// AFTER
{
  "subResources": [
    {
      "childRoute": "chapters",
      "layout": {
        "table": {
          "rowActions": [
            ...
          ]
        }
      }
    }
  ]
}
```

---

## Automated detection — grep checklist

Run these from the repo root to find files needing migration:

```bash
# Layout v1 migration (controls → items, actions → rowActions)
grep -rn '"controls"' --include="resource.json" .
crouton migrate layout --check          # fails with exit 1 if anything needs migration

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

# Deprecated resource-level or layout-level bare "actions"
grep -rn '"actions"' --include="resource.json" .
```

---

## Common mistakes

- **`controls` instead of `items`**: `"controls": [...]` fails validation with a migration hint. Run
  `crouton migrate layout`.
- **`actions` instead of `rowActions`**: `"actions": [...]` on a table node fails validation. Rename to `rowActions`.
- **Table settings on the wrapper, not the table node**: in a wrapper layout, `rowActions`, `tableActions`,
  `searchFields`, `filterFields` must go on the `{ "type": "table", ... }` node, not the outer grid.
- **Field ids directly in a wrapper node**: field ids (strings or `{ id }` objects) are only valid inside the table
  node's `items`. In a wrapper, only component items and nested wrapper nodes are allowed.
- **`type` on a field control is the input type, not a layout type**: `{ "id": "body", "type": "textarea" }` is a field
  control, not a layout node — it's detected as a field because it has `id`.
- **`sortable` on the column, not the item**: `"columns": { "title": { "sortable": true } }` still validates (backward
  compat shim) but won't get autocomplete. Move it to `layout.table.items[].sortable`.
- **`$schema` path wrong**: it's relative to the `resource.json` file, not the project root. Go up one extra `../` per
  directory level.
- **`fieldTable` with a full fieldInput shape**: only `type` and `options` are valid on a table layout item.
- **`searchFields`/`filterFields` in `layout.table`**: these are removed — move them to `operations.findAll.search` /
  `operations.findAll.filter`.
