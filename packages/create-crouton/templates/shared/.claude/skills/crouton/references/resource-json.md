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
    "list": { "columns": ["title", "genre", "publishedAt"] },
    "form": { "rows": [["title", "genre"], ["pageCount", "publishedAt"], ["authorId"]] }
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
| `layout.list.columns` | string[] | no | Columns shown in the list table |
| `layout.form.rows` | string[][] | no | Form layout: each inner array is a row of column names |
