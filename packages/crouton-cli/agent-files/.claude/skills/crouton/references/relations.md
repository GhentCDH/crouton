# Relations — recipes

Relations are configured on the **column** via `column.relation`, not inside `fieldInput.options`.
`fieldInput` only picks and configures the UI widget.

## manyToOne (autocomplete lookup)

Use when: this resource has a FK column pointing to another resource (e.g. `book.authorId → author.id`).

```json
{
  "columns": {
    "authorId": {
      "label": "Author",
      "relation": {
        "resource": "./author/resource.json",
        "type": "manyToOne",
        "foreignKey": "authorId",
        "displayKey": "name"
      },
      "fieldInput": { "type": "autocomplete" }
    }
  },
  "operations": {
    "findAll": { "include": ["author"] },
    "findOne": { "include": ["author"] }
  }
}
```

- `relation.resource`: relative path to the target `resource.json`
- `relation.foreignKey`: FK column on **this** resource
- `relation.displayKey`: field on the related record shown in the dropdown
- `fieldInput.type`: `"autocomplete"` for manyToOne (renders a search dropdown)

## oneToMany (embedded table / panel)

Use when: another resource has a FK pointing to this one (e.g. `review.bookId → book.id`).

```json
{
  "columns": {
    "reviews": {
      "label": "Reviews",
      "hiddenInTable": true,
      "hiddenInForm": true,
      "relation": {
        "resource": "./review/resource.json",
        "type": "oneToMany",
        "foreignKey": "bookId",
        "sort": "createdAt",
        "sortDir": "desc"
      },
      "fieldInput": { "type": "relation" }
    }
  },
  "operations": {
    "findOne": { "include": ["reviews"] }
  }
}
```

- `relation.foreignKey`: FK column on the **target** resource
- `relation.sort` / `relation.sortDir`: default sort for the related list
- `fieldInput.type`: `"relation"` renders an embedded table panel
- Include goes in `findOne.include` only (heavy — skip from `findAll`)

## manyToMany

Use when: a join table connects both resources.

```json
{
  "columns": {
    "tags": {
      "label": "Tags",
      "relation": {
        "resource": "./tag/resource.json",
        "type": "manyToMany",
        "foreignKey": "bookId",
        "name": "tags"
      },
      "fieldInput": { "type": "relation" }
    }
  }
}
```

## Detecting a relation column

Use `isRelation(col)` (exported from `@ghentcdh/crouton-core`) — returns `true` when `col.relation` is set.
Do not check `fieldInput.format` — that is removed.

## column.relation full reference

| Field | Description |
|---|---|
| `resource` | Relative path to target `resource.json` |
| `type` | `"manyToOne"` \| `"oneToMany"` \| `"manyToMany"` |
| `foreignKey` | FK column name |
| `name` | Prisma relation field name (when different from column id) |
| `displayKey` | Field on the related record to show in autocomplete/lookup |
| `sort` | Default sort field for the related list |
| `sortDir` | `"asc"` \| `"desc"` (default `"asc"`) |

## include goes in operations, not at root

```json
// WRONG
{
  "include": ["author"]
}

// RIGHT
{
  "operations": {
    "findAll": { "include": ["author"] },
    "findOne": { "include": ["author"] }
  }
}
```

Run `crouton migrate` to auto-move root `include` to `operations`.
