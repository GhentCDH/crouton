# Relations

A relation is configured on the **column** via `column.relation`. The `fieldInput` only picks and configures the UI
widget.

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
  }
}
```

::: tip Migration
`fieldInput.format: "relation"`, `fieldInput.relationType`, `fieldInput.resource`, and `fieldInput.foreignKey` are
removed.
:::

## column.relation reference

| Field        | Description                                                                      |
|--------------|----------------------------------------------------------------------------------|
| `resource`   | Relative path to the target `resource.json`                                      |
| `type`       | `"manyToOne"` \| `"oneToMany"` \| `"manyToMany"`                                 |
| `foreignKey` | FK column name (on **this** resource for manyToOne; on **target** for oneToMany) |
| `name`       | Prisma relation field name when different from the column id                     |
| `displayKey` | Field on the related record shown in autocomplete / lookup                       |
| `sort`       | Default sort field for the related list                                          |
| `sortDir`    | `"asc"` \| `"desc"` (default `"asc"`)                                            |

## manyToOne (autocomplete lookup)

FK is on **this** resource (e.g. `book.authorId → author.id`).
Frontend renders an autocomplete search dropdown.

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

## oneToMany (embedded panel)

FK is on the **target** resource (e.g. `review.bookId → book.id`).
Frontend renders an embedded table panel inside the detail view.

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

Load oneToMany relations in `findOne.include` only — they are heavy and not needed in the list.

## manyToMany

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

## Loading relations: operations.include

Root `include` is removed. Set includes per operation:

```json
"operations": {
  "findAll": { "include": ["author"] },
  "findOne": { "include": ["author", { "relation": "chapters", "orderBy": { "position": "asc" } }] }
}
```

The object form allows an `orderBy` clause when the relation's default sort isn't enough.

## Detecting a relation column

Use `isRelation(col)` (exported from `@ghentcdh/crouton-core`) — returns `true` when `col.relation` is set.

## `parent.idType`

When a resource is mounted under a parent via `parent.param`, the parent's id type defaults to `"number"`. If the parent
uses string/UUID ids, declare it explicitly:

```json
{
  "kind": "custom",
  "name": "expense",
  "parent": { "route": "groups", "param": "groupId", "idType": "string" }
}
```

## Custom relation control

Register a custom Vue component and reference it from `fieldInput.options`:

```json
{
  "columns": {
    "sections": {
      "relation": {
        "resource": "../section/resource.json",
        "type": "oneToMany",
        "foreignKey": "workId",
        "sort": "sectionNumber",
        "displayKey": "title"
      },
      "fieldInput": {
        "type": "relation",
        "options": { "customComponent": "work-sections" }
      }
    }
  }
}
```

The custom component receives `wrapper`, `value` (v-model), `appliedOptions`, `schema`, and `uischema` as props.

See [Custom renderers](../4.frontend/custom-renderers.md) for how to register the component.

## Complete example

```json
{
  "$schema": "https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json",
  "schemaVersion": 1,
  "name": "book",
  "title": "Books",
  "source": { "model": "Book" },
  "columns": {
    "id": { "idField": true, "hiddenInForm": true },
    "title": {},
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
    "categories": {
      "label": "Categories",
      "hiddenInTable": true,
      "relation": {
        "resource": "./category/resource.json",
        "type": "manyToMany",
        "foreignKey": "bookId"
      },
      "fieldInput": { "type": "relation" }
    }
  },
  "operations": {
    "findAll": { "search": ["title"], "include": ["author"] },
    "findOne": { "include": ["author", "categories"] }
  }
}
```

For a step-by-step walkthrough see [Add relations](../6.recipes/add-relation.md).
