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
      "controls": [
        { "id": "title", "colspan": 8 },
        { "id": "genre", "colspan": 4 },
        { "id": "pageCount", "colspan": 6 },
        { "id": "publishedAt", "colspan": 6 },
        "authorId"
      ],
      "items": [
        { "type": "collapse", "title": "Relations", "controls": ["reviews"] }
      ]
    },
    "view": {
      "type": "grid",
      "columns": 12,
      "controls": ["title", "genre", "pageCount", "publishedAt", "authorId"]
    },
    "table": {
      "controls": ["title", "genre", "publishedAt"],
      "searchFields": ["title"],
      "filterFields": ["genre"],
      "actions": [
        { "id": "editBook", "label": "Edit", "type": "link", "href": "/books/{id}/edit" }
      ],
      "tableActions": [
        { "id": "exportCsv", "label": "Export CSV", "type": "link", "href": "/books/export.csv" }
      ]
    }
  }
}
```

## Key field table

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | string | no | Path to JSON schema for editor validation |
| `schemaVersion` | number | yes | Always `1` |
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
| `layout.form` | LayoutNode | no | Explicit layout for the create/edit form. Absent = columns in source order. |
| `layout.view` | LayoutNode | no | Explicit layout for the read-only detail view. |
| `layout.table` | LayoutNode | no | Explicit layout for the table view (columns + actions). |
| `layout.*.type` | `"grid"\|"vertical"\|"horizontal"\|"collapse"\|"group"` | no | Container type. `"grid"` uses CSS grid; `"collapse"` is a collapsible section. |
| `layout.*.columns` | number (1–12) | no | Number of grid columns. Only for `type: "grid"`. |
| `layout.*.controls` | `(string \| FieldControl \| ComponentControl)[]` | no | Leaf items: column id string, `{ id, colspan?, rowspan?, type?, options?, showWhen? }`, or `{ component }`. |
| `layout.*.items` | LayoutNode[] | no | Nested layout nodes (nested grids, groups, collapse sections). |
| `layout.table.controls[]` | string \| TableFieldControl | no | Table column: string id or `{ id, sortable?, defaultSort? }`. |
| `layout.table.actions` | Action[] | no | Per-record row actions. Each action gets the record id. |
| `layout.table.tableActions` | Action[] | no | Global toolbar actions. No record id. |
| `layout.table.searchFields` | string[] | no | Column ids for `?q=` free-text search. |
| `layout.table.filterFields` | string[] | no | Column ids shown in the filter panel. |
