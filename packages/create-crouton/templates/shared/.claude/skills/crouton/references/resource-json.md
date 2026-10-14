# resource.json — annotated full example

```json
{
  "$schema": "node_modules/@ghentcdh/crouton-core/dist/resource.schema.json",
  "schemaVersion": 1,
  "title": "Book",
  "kind": "default",
  "columns": {
    "id": {
      "fieldInput": { "type": "hidden" }
    },
    "title": {
      "fieldInput": { "type": "string" },
      "label": "Title"
    },
    "pageCount": {
      "fieldInput": { "type": "number" },
      "label": "Page count"
    },
    "publishedAt": {
      "fieldInput": { "type": "date" },
      "label": "Published"
    },
    "genre": {
      "fieldInput": {
        "type": "select",
        "options": [
          { "value": "fiction", "label": "Fiction" },
          { "value": "non-fiction", "label": "Non-fiction" }
        ]
      },
      "label": "Genre"
    },
    "authorId": {
      "fieldInput": {
        "type": "autocomplete",
        "resource": "author",
        "labelField": "name"
      },
      "label": "Author"
    }
  },
  "relations": {
    "author": {
      "type": "manyToOne",
      "resource": "author",
      "foreignKey": "authorId"
    },
    "reviews": {
      "type": "oneToMany",
      "resource": "review",
      "foreignKey": "bookId"
    }
  },
  "layout": {
    "form": {
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
    "table": {
      "items": [
        { "id": "title", "sortable": true, "defaultSort": true },
        "genre",
        "publishedAt",
        "authorId"
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

## Key field table

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | string | no | Path to JSON schema for editor validation |
| `schemaVersion` | number | yes | Current version is `1` |
| `title` | string | yes | Display name for the resource |
| `kind` | `"default"` \| `"custom"` | no | `"default"` = Prisma-backed; `"custom"` = repository.ts |
| `columns` | object | yes | Map of column name → column config |
| `columns[].fieldInput.type` | string | yes | Input type (see field-inputs.md) |
| `columns[].label` | string | no | Override column display label |
| `columns[].hidden` | boolean | no | Hide from list and form |
| `columns[].readonly` | boolean | no | Show but disallow editing |
| `relations` | object | no | Map of relation name → relation config |
| `relations[].type` | `manyToOne` \| `oneToMany` \| `manyToMany` | yes | Relation direction |
| `relations[].resource` | string | yes | Target resource name |
| `relations[].foreignKey` | string | yes (manyToOne/oneToMany) | FK column name |
| `layout.form` / `layout.view` | FormLayoutNode | no | Form/view layout — nodes with `items` arrays |
| `layout.table` | TableLayoutRoot | no | Table layout — table node or wrapper containing one |
| `layout.table.items[]` | string \| FieldControl | no | Column order; field id string or `{ id, sortable, ... }` |
| `layout.table.rowActions` | Action[] | no | Per-record row actions (receive the record id) |
| `layout.table.tableActions` | Action[] | no | Global toolbar actions (no record id) |
| `layout.table.searchFields` | string[] | no | Column ids included in `?q=` search |
| `layout.table.filterFields` | string[] | no | Column ids that get filter controls |

## Layout items

Every entry in a node's `items` array is one of four kinds:

| Shape | Kind |
|---|---|
| `"fieldName"` | Field id — renders field's default input |
| `{ "id": "fieldName", ... }` | Field control — field with overrides (`colspan`, `type`, `options`, …) |
| `{ "component": "Name", ... }` | Component — custom Vue component from `customComponents` |
| Any other object (has `type` but no `id`/`component`) | Nested node — recursive layout container |

Order is preserved — items render exactly in the order declared.

## Table layout: flat vs wrapper

**Flat** (table node is the root):

```json
"table": {
  "items": ["title", "author"],
  "rowActions": [ ... ],
  "tableActions": [ ... ]
}
```

**Wrapper** (outer container with an inner `type: "table"` node):

```json
"table": {
  "type": "grid",
  "columns": 12,
  "items": [
    { "component": "CreateByIsbn", "colspan": 12 },
    {
      "type": "table",
      "title": "Books",
      "items": ["title", "author", { "id": "isbn", "sortable": true }],
      "searchFields": ["title", "isbn"],
      "rowActions": [ { "id": "open", "type": "link", "href": "/isbn/{isbn}", "label": "Open" } ]
    }
  ]
}
```

All table settings (`rowActions`, `tableActions`, `searchFields`, `filterFields`, `title`) go on the **`type: "table"` node**, never on the outer wrapper.
