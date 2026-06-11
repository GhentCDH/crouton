# resource.json

Each resource is described by a `resource.json` file in its own directory under `resources/`. This one file drives the API endpoints, validation wiring, table columns, form fields, and filters.

## A complete example

```json
{
  "name": "book",
  "route": "books",
  "model": "book",
  "tag": "Book",
  "title": "Books",
  "database": "maindb",
  "sidebar": { "hide": false, "position": 1 },
  "operations": {
    "findAll": true,
    "findOne": true,
    "create": true,
    "update": true,
    "delete": true
  },
  "columns": {
    "id": {
      "idField": true,
      "hiddenInTable": true,
      "hiddenInForm": true,
      "hiddenInView": true
    },
    "title": {
      "searchable": true,
      "sortable": true,
      "defaultSort": true
    },
    "summary": {
      "hiddenInTable": true,
      "fieldInput": { "type": "textarea" }
    },
    "created_at": {
      "hiddenInTable": true,
      "hiddenInForm": true,
      "createable": false,
      "updateable": false
    }
  }
}
```

## Top-level fields

| Field | Type | Description |
| --- | --- | --- |
| `name` | `string` | Unique resource name (used as form id in the frontend) |
| `route` | `string` | URL segment for the generated endpoints |
| `model` | `string` | Prisma model name |
| `tag` | `string` | OpenAPI tag |
| `title` | `string` | Display title in the UI |
| `table` | `string` | Database table (when it differs from the model) |
| `idType` | `'number' \| 'string'` | Type of the id field (default `number`) |
| `database` | `string` | Name of the [data source](./datasource.md) to use |
| `sidebar` | `{ hide?, position? }` | Sidebar visibility and ordering |
| `operations` | object | Enable `findAll`, `findOne`, `create`, `update`, `upsert`, `delete` |
| `columns` | map or array | Column definitions, see below |
| `calculatedColumns` | array | SQL-computed read-only columns, see below |
| `actions` | array | Row-level [actions](./actions.md) |
| `tableActions` | array | Table-level [actions](./actions.md) |
| `modalSize` | `'xs' \| 'sm' \| 'lg' \| 'xl'` | Size of the create/edit modal |
| `include` | array | Relations to eagerly load, see below |

## Columns

| Option | Description |
| --- | --- |
| `idField` | Marks the id column |
| `label` / `hideLabel` | Display label, or hide it |
| `hiddenInTable` / `hiddenInForm` / `hiddenInView` | Visibility per context |
| `sortable` / `defaultSort` | Sorting; `sortId` overrides the sort column |
| `searchable` | Included in free-text search |
| `filterable` | Gets a filter control |
| `createable` / `updateable` | Whether the field is written on create/update |
| `showWhen` / `hideWhen` / `disabledWhen` | Conditional display: `{ "field": "...", "eq"/"neq"/"exists": ... }` |
| `displayKey` | Nested field to display (e.g. `author.name`) |
| `showInLookup` | Shown in autocomplete lookups of this resource |
| `fieldInput` | Form control configuration, see below |

### Field inputs

`fieldInput` selects and configures the form control:

```json
{
  "column": "summary",
  "fieldInput": {
    "type": "textarea",
    "position": 2,
    "options": { "colspan": 4 }
  }
}
```

## Relations (sub-resources)

A relation is configured as a column with `fieldInput.format: "relation"` pointing to a sub-resource file in the same directory:

```json
{
  "column": "author_id",
  "fieldInput": {
    "format": "relation",
    "relationType": "manyToOne",
    "resource": "./resource.author"
  }
}
```

`resource.author.json` then describes the related resource (its columns, operations, and lookup display). Supported `relationType` values: `oneToOne`, `manyToOne`, `oneToMany`, `manyToMany`.

The frontend picks the matching control automatically — an autocomplete for `manyToOne`, an editable nested table for `oneToMany`, and so on.

## Calculated columns

Read-only columns computed in SQL at query time. Use `main` as the alias for the resource's own table:

```json
{
  "calculatedColumns": [
    {
      "id": "chapter_count",
      "alias": "chapter_count",
      "label": "Chapters",
      "type": "number",
      "sqlExpression": "(SELECT count(*) FROM chapter c WHERE c.book_id = main.id)"
    }
  ]
}
```

## Includes

Eagerly load relations with the list/detail queries:

```json
{
  "include": [
    "author",
    { "relation": "chapters", "include": ["sections"] }
  ]
}
```

## Escape hatch: resource.ts

When JSON is not expressive enough, replace `resource.json` with a `resource.ts` that default-exports a full `ResourceConfig` object. The loader falls back to it automatically when no `resource.json` is present.
