---
description: Add manyToOne (autocomplete) and oneToMany (table) relations to a resource.
---

# Add relations

Relations are declared as columns on the **child** (the model that holds the foreign key). The frontend picks the correct control based on `relationType`.

## manyToOne — autocomplete

A `manyToOne` relation stores a foreign key in the child model's table. Declare it on the FK column:

```json
"authorId": {
  "label": "Author",
  "searchable": true,
  "fieldInput": {
    "type": "autocomplete",
    "relationType": "manyToOne",
    "resource": "./author.resource"
  }
}
```

Required fields:
- `fieldInput.type`: `"autocomplete"` — renders a searchable dropdown
- `fieldInput.relationType`: `"manyToOne"` — tells the frontend this is a single-select
- `fieldInput.resource`: relative path to the related resource file (`.resource` extension resolves to `resource.json`)

Add the relation name to `include` so the backend eagerly loads it:

```json
"include": ["author"]
```

## oneToMany — sub-resource table

A `oneToMany` relation shows the related records as an embedded table in the parent's detail view. Declare it on the **parent** resource using the Prisma relation field name (not the FK column):

```json
"books": {
  "label": "Books",
  "hiddenInTable": true,
  "hiddenInForm": true,
  "fieldInput": {
    "format": "relation",
    "relationType": "oneToMany",
    "resource": "./book.resource"
  }
}
```

Required fields:
- `fieldInput.format`: `"relation"` — triggers sub-resource rendering
- `fieldInput.relationType`: `"oneToMany"` — renders an embedded table
- `fieldInput.resource`: relative path to the child resource

Add the relation name to `include`:

```json
"include": ["books"]
```

## Complete example — parent (author) + child (book)

**`resources/author/resource.json`** (the oneToMany side):

```json
{
  "$schema": "https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json",
  "schemaVersion": 1,
  "name": "author",
  "model": "Author",
  "title": "Authors",
  "columns": {
    "id": { "idField": true, "hiddenInForm": true },
    "name": { "searchable": true, "filterable": true, "sortable": true },
    "bio": { "fieldInput": { "type": "textarea" }, "hiddenInTable": true },
    "books": {
      "label": "Books",
      "hiddenInTable": true,
      "hiddenInForm": true,
      "fieldInput": {
        "format": "relation",
        "relationType": "oneToMany",
        "resource": "./book.resource"
      }
    }
  },
  "include": ["books"]
}
```

**`resources/book/resource.json`** (the manyToOne side, FK column `authorId`):

```json
{
  "$schema": "https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json",
  "schemaVersion": 1,
  "name": "book",
  "model": "Book",
  "title": "Books",
  "columns": {
    "id": { "idField": true, "hiddenInForm": true },
    "title": { "searchable": true, "sortable": true },
    "authorId": {
      "label": "Author",
      "searchable": true,
      "fieldInput": {
        "type": "autocomplete",
        "relationType": "manyToOne",
        "resource": "./author.resource"
      }
    }
  },
  "include": ["author"]
}
```

## Common mistake: wrong direction

The `manyToOne` column goes on the model that **holds the FK**. The book holds `authorId`, so `manyToOne` is on the book, not on the author.

| Symptom | Cause |
|---|---|
| Autocomplete shows but saves nothing | `relationType` is `oneToMany` on the FK column |
| Sub-resource table appears on the wrong side | `format: "relation"` / `oneToMany` declared on the child instead of the parent |

See [Common mistakes](./common-mistakes.md#wrong-relation-direction) for details.

## Custom foreign key name

When the FK column does not follow the `${ParentModel}Id` convention, set `foreignKey` on `fieldInput`:

```json
"authorId": {
  "fieldInput": {
    "type": "autocomplete",
    "relationType": "manyToOne",
    "resource": "./author.resource",
    "foreignKey": "writer_id"
  }
}
```

See [Relations reference](../2.resources/relations.md) for all options including sorting and custom components.
