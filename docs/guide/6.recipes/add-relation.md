---
description: Add manyToOne (autocomplete) and oneToMany (table) relations to a resource.
---

# Add relations

Relations are declared as columns on the **child** (the model that holds the foreign key). The relation itself lives in `column.relation`; `fieldInput` only picks the UI widget.

## manyToOne — autocomplete

A `manyToOne` relation stores a foreign key in the child model's table. Declare it on the FK column:

```json
"authorId": {
  "label": "Author",
  "relation": {
    "resource": "./author.resource",
    "type": "manyToOne"
  },
  "fieldInput": {
    "type": "autocomplete"
  }
}
```

Required fields:
- `relation.resource`: relative path to the related resource file (`.resource` extension resolves to `resource.json`)
- `relation.type`: `"manyToOne"` — tells the frontend this is a single-select
- `fieldInput.type`: `"autocomplete"` — renders a searchable dropdown

Add the relation name to `operations.<op>.include` so the backend eagerly loads it:

```json
"operations": {
  "findAll": { "include": ["author"] },
  "findOne": { "include": ["author"] }
}
```

## oneToMany — sub-resource table

A `oneToMany` relation shows the related records as an embedded table in the parent's detail view. Declare it on the **parent** resource using the Prisma relation field name (not the FK column):

```json
"books": {
  "label": "Books",
  "hiddenInTable": true,
  "hiddenInForm": true,
  "relation": {
    "resource": "./book.resource",
    "type": "oneToMany"
  }
}
```

Required fields:
- `relation.resource`: relative path to the child resource — declaring `relation` triggers sub-resource rendering
- `relation.type`: `"oneToMany"` — renders an embedded table

Add the relation name to `operations.findOne.include`:

```json
"operations": {
  "findOne": { "include": ["books"] }
}
```

## Complete example — parent (author) + child (book)

**`resources/author/resource.json`** (the oneToMany side):

```json
{
  "$schema": "https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json",
  "schemaVersion": 1,
  "name": "author",
  "source": {
    "model": "Author"
  },
  "title": "Authors",
  "columns": {
    "id": {
      "idField": true,
      "hiddenInForm": true
    },
    "name": {
      "sortable": true
    },
    "bio": {
      "fieldInput": {
        "type": "textarea"
      },
      "hiddenInTable": true
    },
    "books": {
      "label": "Books",
      "hiddenInTable": true,
      "hiddenInForm": true,
      "relation": {
        "resource": "./book.resource",
        "type": "oneToMany"
      }
    }
  },
  "operations": {
    "findAll": {
      "include": [
        "books"
      ],
      "search": [
        "name"
      ],
      "filter": [
        "name"
      ]
    }
  }
}
```

**`resources/book/resource.json`** (the manyToOne side, FK column `authorId`):

```json
{
  "$schema": "https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json",
  "schemaVersion": 1,
  "name": "book",
  "source": {
    "model": "Book"
  },
  "title": "Books",
  "columns": {
    "id": {
      "idField": true,
      "hiddenInForm": true
    },
    "title": {
      "sortable": true
    },
    "authorId": {
      "label": "Author",
      "relation": {
        "resource": "./author.resource",
        "type": "manyToOne"
      },
      "fieldInput": {
        "type": "autocomplete"
      }
    }
  },
  "operations": {
    "findAll": {
      "include": [
        "author"
      ],
      "search": [
        "title",
        "authorId"
      ]
    }
  }
}
```

## Common mistake: wrong direction

The `manyToOne` column goes on the model that **holds the FK**. The book holds `authorId`, so `manyToOne` is on the book, not on the author.

| Symptom | Cause |
|---|---|
| Autocomplete shows but saves nothing | `relation.type` is `oneToMany` on the FK column |
| Sub-resource table appears on the wrong side | `relation.type: "oneToMany"` declared on the child instead of the parent |

See [Common mistakes](./common-mistakes.md#wrong-relation-direction) for details.

## Custom foreign key name

When the FK column does not follow the `${ParentModel}Id` convention, set `relation.foreignKey`:

```json
"authorId": {
  "relation": {
    "resource": "./author.resource",
    "type": "manyToOne",
    "foreignKey": "writer_id"
  },
  "fieldInput": {
    "type": "autocomplete"
  }
}
```

See [Relations reference](../2.resources/relations.md) for all options including sorting and custom components.
