# resource.json

Each resource is described by a `resource.json` file in its own directory under `resources/`. This one file drives the
API endpoints, validation wiring, table columns, form fields, and filters.

## A complete example

```json
{
  "name": "book",
  "route": "books",
  "model": "book",
  "tag": "Book",
  "title": "Books",
  "database": "maindb",
  "sidebar": {
    "position": 1,
    "label": "Books",
    "group": "catalogue"
  },
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
      "fieldInput": {
        "type": "textarea"
      }
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

| Field               | Type                           | Description                                                          |
|---------------------|--------------------------------|----------------------------------------------------------------------|
| `name`              | `string`                       | Unique resource name (used as form id in the frontend)               |
| `route`             | `string`                       | URL segment for the generated endpoints                              |
| `model`             | `string`                       | Prisma model name                                                    |
| `tag`               | `string`                       | OpenAPI tag                                                          |
| `title`             | `string`                       | Display title in the UI                                              |
| `table`             | `string`                       | Database table (when it differs from the model)                      |
| `idType`            | `'number' \| 'string'`         | Type of the id field (default `number`)                              |
| `database`          | `string`                       | Name of the [data source](./datasource.md) to use                    |
| `sidebar`           | object                         | Sidebar visibility, ordering, and grouping — see [Sidebar](#sidebar) |
| `operations`        | object                         | Enable `findAll`, `findOne`, `create`, `update`, `upsert`, `delete`  |
| `columns`           | map or array                   | Column definitions, see below                                        |
| `calculatedColumns` | array                          | SQL-computed read-only columns, see below                            |
| `actions`           | array                          | Row-level [actions](./actions.md)                                    |
| `tableActions`      | array                          | Table-level [actions](./actions.md)                                  |
| `modalSize`         | `'xs' \| 'sm' \| 'lg' \| 'xl'` | Size of the create/edit modal                                        |
| `include`           | array                          | Relations to eagerly load, see below                                 |

## Columns

| Option                                            | Description                                                         |
|---------------------------------------------------|---------------------------------------------------------------------|
| `idField`                                         | Marks the id column                                                 |
| `label` / `hideLabel`                             | Display label, or hide it                                           |
| `hiddenInTable` / `hiddenInForm` / `hiddenInView` | Visibility per context                                              |
| `sortable` / `defaultSort`                        | Sorting; `sortId` overrides the sort column                         |
| `searchable`                                      | Included in free-text search                                        |
| `filterable`                                      | Gets a filter control                                               |
| `createable` / `updateable`                       | Whether the field is written on create/update                       |
| `showWhen` / `hideWhen` / `disabledWhen`          | Conditional display: `{ "field": "...", "eq"/"neq"/"exists": ... }` |
| `displayKey`                                      | Nested field to display (e.g. `author.name`)                        |
| `showInLookup`                                    | Shown in autocomplete lookups of this resource                      |
| `fieldInput`                                      | Form control configuration, see below                               |

### Field inputs

`fieldInput` selects and configures the form control:

```json
{
  "column": "summary",
  "fieldInput": {
    "type": "textarea",
    "position": 2,
    "options": {
      "colspan": 4
    }
  }
}
```

## Relations (sub-resources)

A relation is configured as a column with `fieldInput.format: "relation"` pointing to a sub-resource file in the same
directory:

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

`resource.author.json` then describes the related resource (its columns, operations, and lookup display). Supported
`relationType` values: `oneToOne`, `manyToOne`, `oneToMany`, `manyToMany`.

The frontend picks the matching control automatically — an autocomplete for `manyToOne`, an editable nested table for
`oneToMany`, and so on.

### Relation options

`fieldInput.options` accepts the following fields for relation columns:

| Option        | Type                  | Description                                                                  |
|---------------|-----------------------|------------------------------------------------------------------------------|
| `displayKey`  | `string`              | Field used as the label in the relation control (e.g. `"title"`)             |
| `direction`   | `'row' \| 'column'`  | CSS flex direction for the relation button layout                             |
| `sort`        | `string`              | Field to sort related records by, e.g. `"title"` or `"author.name"`         |
| `sortDir`     | `'asc' \| 'desc'`    | Sort direction (default `"asc"`)                                              |

### Sorting related records

Add `sort` (and optionally `sortDir`) to `fieldInput.options` to control the order of related records. This affects two places:

- **Backend includes** — when the parent record is fetched, the included relation records are returned in the specified order (Prisma `orderBy` inside the `include` clause).
- **Frontend picker** — when the relation control fetches its option list (autocomplete / dropdown), the same sort params are forwarded as query parameters.

```json
{
  "id": "sections",
  "label": "Sections",
  "hiddenInForm": true,
  "fieldInput": {
    "type": "relation",
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
    {
      "relation": "chapters",
      "include": [
        "sections"
      ]
    }
  ]
}
```

When a relation column has a `sort` option (see [Sorting related records](#sorting-related-records)), the loader automatically injects the corresponding `orderBy` into the include clause — no manual configuration needed.

## Sidebar

The `sidebar` object controls how (and whether) a resource appears in the admin navigation. All fields are optional.

| Field      | Type      | Description                                                                                                                                        |
|------------|-----------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| `hide`     | `boolean` | Exclude this resource from the sidebar entirely (default `false`)                                                                                  |
| `position` | `number`  | Order within its group or at the top level. Lower values come first; resources without a position are sorted alphabetically after positioned ones. |
| `label`    | `string`  | Override the sidebar label. Defaults to the resource `title`.                                                                                      |
| `group`    | `string`  | Slug of a group defined in `sidebarGroups` in `crouton.json`. Resources with the same `group` are nested under a shared collapsible section.       |

Group labels and ordering are configured centrally in `crouton.json`, not per resource.
See [Sidebar groups](#sidebar-groups) below.

### Example — grouping metadata resources

```json
// crouton.json
{
  "sidebarGroups": {
    "metadata": {
      "label": "Metadata",
      "position": 10
    }
  }
}
```

```json
// author.resource.json
{
  "name": "author",
  "sidebar": {
    "label": "Authors",
    "group": "metadata",
    "position": 1
  }
}
```

```json
// genre.resource.json
{
  "name": "genre",
  "sidebar": {
    "label": "Genres",
    "group": "metadata",
    "position": 2
  }
}
```

This renders as:

```
Texts
▾ Metadata
    Authors
    Genres
```

## Sidebar groups

Groups are defined in `crouton.json` under `sidebarGroups`, keyed by slug:

```json
{
  "sidebarGroups": {
    "metadata": {
      "label": "Metadata",
      "position": 10
    },
    "admin": {
      "label": "Admin",
      "position": 20
    }
  }
}
```

| Field      | Type     | Description                                                                  |
|------------|----------|------------------------------------------------------------------------------|
| `label`    | `string` | Heading shown in the sidebar. Defaults to a title-cased version of the slug. |
| `position` | `number` | Order of this group among top-level sidebar items.                           |

Keeping groups in the config file instead of individual resource files ensures label and ordering are defined exactly
once and can't drift out of sync.

## Escape hatch: resource.ts

When JSON is not expressive enough, replace `resource.json` with a `resource.ts` that default-exports a full
`ResourceConfig` object. The loader falls back to it automatically when no `resource.json` is present.
