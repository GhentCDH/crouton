# resource.json — annotated full example

```json
{
  "$schema": "node_modules/@ghentcdh/crouton-core/dist/resource.schema.json",
  "schemaVersion": 1,
  "name": "book",
  "title": "Books",
  "kind": "prisma",
  "source": {
    "model": "Book"
  },
  "lookup": {
    "labels": ["title", "authorId"],
    "separator": " · "
  },
  "openapi": {
    "tag": "Books"
  },
  "columns": {
    "id": {
      "idField": true,
      "hiddenInForm": true
    },
    "title": {
      "label": "Title",
      "fieldInput": { "type": "string" }
    },
    "pageCount": {
      "label": "Page count",
      "fieldInput": { "type": "number" }
    },
    "publishedAt": {
      "label": "Published",
      "fieldInput": { "type": "date" }
    },
    "genre": {
      "label": "Genre",
      "fieldInput": {
        "type": "select",
        "options": { "values": [
          { "value": "fiction", "label": "Fiction" },
          { "value": "non-fiction", "label": "Non-fiction" }
        ]}
      }
    },
    "authorId": {
      "label": "Author",
      "relation": {
        "resource": "./author/resource.json",
        "type": "manyToOne",
        "foreignKey": "authorId",
        "displayKey": "name"
      },
      "fieldInput": { "type": "autocomplete" }
    },
    "chapterCount": {
      "label": "Chapters",
      "type": "number",
      "computed": {
        "sql": "SELECT COUNT(*) FROM chapter WHERE chapter.book_id = main.id"
      }
    }
  },
  "operations": {
    "findAll": {
      "search": ["title"],
      "include": ["author"]
    },
    "findOne": {
      "include": ["author", { "relation": "chapters", "orderBy": { "position": "asc" } }]
    }
  },
  "layout": {
    "form": {
      "container": { "mode": "modal", "size": "lg" },
      "type": "grid",
      "columns": 12,
      "items": [
        { "id": "title", "colspan": 9 },
        { "id": "genre", "colspan": 3 },
        "pageCount",
        "publishedAt",
        "authorId",
        {
          "type": "collapse",
          "title": "Metadata",
          "items": ["createdAt", "updatedAt"]
        }
      ]
    },
    "view": {
      "container": { "mode": "page" }
    },
    "table": {
      "pageSize": 50,
      "pageSizes": [20, 50, 100],
      "density": "compact",
      "rowClick": "view",
      "items": [
        { "id": "title", "sortable": true, "defaultSort": "asc", "width": "md", "truncate": 2 },
        { "id": "pageCount", "align": "right", "width": "xs" },
        { "id": "publishedAt", "sortable": true },
        { "id": "authorId" },
        { "id": "genre", "visible": false }
      ],
      "searchFields": ["title"],
      "filterFields": ["genre"],
      "rowActions": [
        { "id": "preview", "type": "link", "href": "/preview/{id}", "label": "Preview" }
      ],
      "tableActions": [
        { "id": "export", "label": "Export CSV", "procedure": "exportCsv" }
      ]
    }
  }
}
```

## Where does a key go?

| Concern | Key location |
|---|---|
| Data shape / validation / form input | `columns[id].*` |
| How a record opens (modal vs page, size) | `layout.form.container` / `layout.view.container` |
| Table display (width, align, pin, truncate) | `layout.table.items[].options` or item fields |
| Storage (Prisma model, db table, datasource) | `source.*` |
| Query / endpoints (search, include, filter) | `operations.<op>.*` |
| Relation data model (type, FK, display field) | `columns[id].relation` |
| Dropdown label in other resources | `lookup.labels` |
| Navigation / sidebar | `sidebar` |
| Access control | `security` |

## Root-level key reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | string | no | Path to JSON schema for editor autocomplete |
| `schemaVersion` | number | yes | Must be `1` |
| `name` | string | yes | Resource identifier (matches directory name) |
| `title` | string | yes | Display name for the resource |
| `kind` | `"prisma"` \| `"custom"` | no | `"prisma"` = Prisma-backed (default); `"custom"` = repository.ts |
| `source` | object | prisma only | Storage config — see below |
| `source.model` | string | prisma | Prisma model name (was root `model`) |
| `source.dbTable` | string | no | Override DB table name (was root `table`) |
| `source.datasource` | string | no | Named datasource from `crouton.json` (was root `database`) |
| `source.idType` | `"number"` \| `"string"` | no | PK type (was root `idType`) |
| `lookup` | object | no | How this resource labels itself in other resources' dropdowns |
| `lookup.labels` | string[] | no | Column ids to show (ordered); replaces per-column `showInLookup` |
| `lookup.separator` | string | no | Separator between label parts (default `" "`) |
| `openapi` | object | no | OpenAPI metadata |
| `openapi.tag` | string | no | API tag group name (default `"Crouton"`) |
| `columns` | object | yes | Map of column id → column config |
| `operations` | object | no | Per-operation query config |
| `layout` | object | no | Presentation config (form / view / table) |
| `sidebar` | object | no | Navigation placement |
| `security` | object | no | Role-based access rules |

## Column reference

| Field | Type | Description |
|---|---|---|
| `label` | string | Human-readable label (defaults to title-cased id) |
| `idField` | boolean | Mark as primary-key column (exactly one per resource) |
| `hiddenInTable` | boolean | Hide in list view |
| `hiddenInForm` | boolean | Hide in create/edit form |
| `hiddenInView` | boolean | Hide in detail view |
| `createable` | boolean | Include in create form (default `true`) |
| `updateable` | boolean | Include in edit form (default `true`) |
| `required` | boolean | Override Prisma-derived required state in forms |
| `unique` | boolean \| UniqueConfig | Enforce uniqueness; object form allows `scope`, `caseInsensitive`, `message` |
| `type` | string \| object | Data type (`"string"`, `"number"`, `"boolean"`, `"date"`, `"date-time"`, `"object"`, `"array"`) or JSON Schema fragment |
| `fieldInput` | object | UI input widget config — see field-inputs.md |
| `relation` | object | Relation data model — see below |
| `computed` | object | SQL computed column — `{ sql, type? }` |
| `enum` | string | Shared enum name from `crouton.enums.json` (mutually exclusive with `fieldInput.options.values`) |
| `displayKey` | string | Dot-path to display a nested property |
| `extend` | string | Relative path to another resource.json to expand as sub-columns |

## column.relation reference

Put relation config here, not in `fieldInput.options`:

```json
"authorId": {
  "relation": {
    "resource": "./author/resource.json",
    "type": "manyToOne",
    "foreignKey": "authorId",
    "name": "author",
    "displayKey": "name",
    "sort": "name",
    "sortDir": "asc"
  },
  "fieldInput": { "type": "autocomplete" }
}
```

| Field | Description |
|---|---|
| `resource` | Relative path to target resource.json |
| `type` | `"manyToOne"` \| `"oneToMany"` \| `"manyToMany"` |
| `foreignKey` | FK column name (on this resource for manyToOne, on target for oneToMany) |
| `name` | Prisma relation field name (when different from column id) |
| `displayKey` | Field on the related record to show in the autocomplete |
| `sort` / `sortDir` | Default sort for the related list |

`isRelation(col)` returns `true` when `col.relation` is set.

## operations reference

```json
"operations": {
  "findAll": {
    "search": ["title", "isbn"],
    "include": ["author"]
  },
  "findOne": {
    "include": ["author", { "relation": "chapters", "orderBy": { "position": "asc" } }]
  },
  "create": {},
  "update": {},
  "delete": {}
}
```

Root `include` is removed — set `findAll.include` and `findOne.include` separately so heavy relations can be loaded only on the detail view.

## layout.form / layout.view container

```json
"layout": {
  "form": {
    "container": { "mode": "modal", "size": "lg" }
  },
  "view": {
    "container": { "mode": "page" }
  }
}
```

| Field | Values | Description |
|---|---|---|
| `container.mode` | `"modal"` \| `"page"` | How the record opens (default `"modal"`) |
| `container.size` | `"xs"` \| `"sm"` \| `"lg"` \| `"xl"` | Modal width (default `"sm"`) |

`display` and `modalSize` at root are removed — use `layout.<form\|view>.container`.

## layout.table item options

```json
"items": [
  { "id": "title",       "width": "md", "truncate": 2, "sortable": true, "defaultSort": "desc" },
  { "id": "pageCount",   "align": "right", "width": "xs" },
  { "id": "status",      "pin": "left" },
  { "id": "internalRef", "visible": false, "headerTooltip": "Internal reference number" }
]
```

| Option | Type | Description |
|---|---|---|
| `width` | `"xs"` \| `"sm"` \| `"md"` \| `"lg"` \| `"xl"` or CSS value | Column width |
| `minWidth` / `maxWidth` | CSS value | Width constraints |
| `align` | `"left"` \| `"center"` \| `"right"` | Cell text alignment |
| `truncate` | `boolean` \| number | `true` = single-line ellipsis; number = max lines before clamp |
| `pin` | `"left"` \| `"right"` | Sticky column |
| `visible` | boolean | `false` = hidden by default (no column chooser yet) |
| `headerTooltip` | string | Tooltip text on the column header |
| `defaultSort` | `true` \| `"asc"` \| `"desc"` | Initial sort; `true` = `"asc"` |

## layout.table node options

```json
"table": {
  "pageSize": 50,
  "pageSizes": [20, 50, 100],
  "density": "compact",
  "selectable": true,
  "rowClick": "view",
  "emptyText": "No books yet",
  "items": [...]
}
```

| Option | Description |
|---|---|
| `pageSize` | Default page size (frontend hint; server still caps it) |
| `pageSizes` | Page size selector options |
| `density` | `"normal"` \| `"compact"` |
| `selectable` | Row checkboxes |
| `rowClick` | `"view"` \| `"edit"` \| `"none"` — what a row click opens |
| `emptyText` | Message shown when there are no rows |

## Layout items

Every entry in a node's `items` array is one of:

| Shape | Kind |
|---|---|
| `"fieldName"` | Field id — renders field's default input |
| `{ "id": "fieldName", ... }` | Field control — field with overrides |
| `{ "component": "Name", ... }` | Custom Vue component |
| Object with `type` but no `id`/`component` | Nested container node |

## Table layout: flat vs wrapper

All table-specific settings (`rowActions`, `tableActions`, `searchFields`, `filterFields`, table options) go on the **`type: "table"` node**, never on an outer wrapper.

```json
"table": {
  "type": "grid",
  "items": [
    { "component": "CreateByIsbn", "colspan": 12 },
    {
      "type": "table",
      "pageSize": 50,
      "items": ["title", "isbn"],
      "searchFields": ["title", "isbn"]
    }
  ]
}
```

## Layout is the full list

When `layout.<ctx>` is defined, its `items` list is exhaustive — only listed columns render. Columns not listed are hidden regardless of `hiddenIn*`. Run `crouton migrate` after adding a layout to an existing resource.
