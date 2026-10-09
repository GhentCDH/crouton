# Relations

A relation is configured as a column with `fieldInput.format: "relation"` pointing to a sub-resource file:

```json
{
  "column": "author_id",
  "fieldInput": {
    "format": "relation",
    "relationType": "manyToOne",
    "resource": "./author.resource"
  }
}
```

`author.resource.json` describes the related resource (its columns, operations, and lookup display). Supported
`relationType` values: `oneToOne`, `manyToOne`, `oneToMany`, `manyToMany`.

The frontend picks the matching control automatically — an autocomplete for `manyToOne`, an editable nested table for
`oneToMany`, and so on.

## Foreign key

By default, the foreign key on the child model is derived as `${parentModel}Id` (camelCase), matching the standard
Prisma convention. If the FK field in your Prisma schema uses a different name, set `foreignKey` on `fieldInput`:

```json
{
  "column": "section",
  "fieldInput": {
    "format": "relation",
    "relationType": "oneToMany",
    "resource": "../section/resource.json",
    "foreignKey": "work_id"
  }
}
```

When omitted, a parent model named `work` produces `foreignKey: "workId"`.

## Relation options

`fieldInput.options` accepts the following fields for relation columns:

| Option              | Type                | Description                                                             |
|---------------------|---------------------|-------------------------------------------------------------------------|
| `displayKey`        | `string`            | Field used as the label in the relation control (e.g. `"title"`)        |
| `direction`         | `'row' \| 'column'` | CSS flex direction for the relation button layout                       |
| `sort`              | `string`            | Field to sort related records by, e.g. `"title"` or `"author.name"`    |
| `sortDir`           | `'asc' \| 'desc'`   | Sort direction (default `"asc"`)                                        |
| `customComponent`   | `string`            | Name of a custom Vue component to override the relation control         |

## Sorting related records

Add `sort` (and optionally `sortDir`) to `fieldInput.options` to control the order of related records. This affects:

- **Backend includes** — when the parent record is fetched, the included relation records are returned in the specified
  order (Prisma `orderBy` inside the `include` clause).
- **Frontend picker** — when the relation control fetches its option list, the same sort params are forwarded as query
  parameters.

```json
{
  "id": "sections",
  "label": "Sections",
  "hiddenInForm": true,
  "fieldInput": {
    "format": "relation",
    "resource": "./section/resource.json",
    "options": {
      "sort": "title",
      "sortDir": "asc",
      "displayKey": "title"
    }
  }
}
```

Dotted paths work too — `"sort": "author.name"` sorts by a nested field.

## `parent.idType`

When a resource is mounted under a parent via `parent.param`, the parent's id type defaults to `"number"`. If the
parent uses string/UUID ids, declare it explicitly:

```json
{
  "kind": "custom",
  "name": "expense",
  "parent": { "route": "groups", "param": "groupId", "idType": "string" }
}
```

## Custom relation control

Register a custom Vue component in the `customComponents` registry and reference it from `fieldInput.options`:

```json
{
  "column": "sections",
  "fieldInput": {
    "format": "relation",
    "resource": "../section/resource.json",
    "options": {
      "customComponent": "work-sections",
      "sort": "section_number",
      "displayKey": "title"
    }
  }
}
```

The custom component receives `wrapper`, `value` (v-model), `appliedOptions`, `schema`, and `uischema` as props.
All `fieldInput.options` are available via `appliedOptions`.

See [Custom renderers](../4.frontend/custom-renderers.md) for how to register the component.

## Complete example

A full `resource.json` showing manyToOne (autocomplete) and manyToMany (embedded table) relations together:

```json
{
  "$schema": "https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json",
  "schemaVersion": 1,
  "name": "book",
  "model": "Book",
  "title": "Books",
  "columns": {
    "id": { "idField": true, "hiddenInForm": true },
    "title": { "searchable": true, "filterable": true, "sortable": true },
    "authorId": {
      "label": "Author",
      "searchable": true,
      "fieldInput": {
        "type": "autocomplete",
        "relationType": "manyToOne",
        "resource": "./author.resource"
      }
    },
    "categories": {
      "label": "Categories",
      "hiddenInTable": true,
      "fieldInput": {
        "format": "relation",
        "relationType": "manyToMany",
        "resource": "./category.resource"
      }
    }
  },
  "include": ["author", "categories"]
}
```

For a step-by-step walkthrough see [Add relations](../6.recipes/add-relation.md).
