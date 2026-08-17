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
| `$schema`           | `string`                       | URL of the generated JSON Schema, for editor autocomplete — see [Versioning](./resource-versioning.md#schema-and-stamping) |
| `schemaVersion`     | `number`                       | resource.json shape version; auto-migrated in dev — see [Versioning](./resource-versioning.md) |
| `draft`             | `boolean`                      | When `true`, kept in the repo but not loaded/served — see [Draft resources](./resource-versioning.md#draft-resources) |
| `kind`              | `'prisma' \| 'custom'`         | Where the data comes from. Default `prisma`. `custom` means no Prisma model and no `schema.ts` — you implement data access in `repository.ts`, see [Custom resources](./custom-resource.md) |
| `name`              | `string`                       | Unique resource name (used as form id in the frontend)               |
| `route`             | `string`                       | URL segment for the generated endpoints                              |
| `model`             | `string`                       | Prisma model name. Required when `kind` is `prisma`; must be omitted when `kind` is `custom` |
| `tag`               | `string`                       | OpenAPI tag                                                          |
| `title`             | `string`                       | Display title in the UI                                              |
| `table`             | `string`                       | Database table (when it differs from the model)                      |
| `idType`            | `'number' \| 'string'`         | Type of the id field (default `string`)                              |
| `database`          | `string`                       | Name of the [data source](./datasource.md) to use                    |
| `sidebar`           | object                         | Sidebar visibility, ordering, and grouping — see [Sidebar](#sidebar) |
| `display`           | object                         | `mode` (`'page'` \| `'modal'`, default `'modal'`) and `customComponent`, see [Display](#display) |
| `operations`        | object                         | Enable `findAll`, `findOne`, `create`, `update`, `patch`, `upsert`, `delete` |
| `columns`           | map or array                   | Column definitions, see below                                        |
| `calculatedColumns` | array                          | SQL-computed read-only columns, see below                            |
| `actions`           | array                          | Row-level [actions](./actions.md)                                    |
| `tableActions`      | array                          | Table-level [actions](./actions.md)                                  |
| `modalSize`         | `'xs' \| 'sm' \| 'lg' \| 'xl'` | Size of the create/edit modal                                        |
| `include`           | array                          | Relations to eagerly load, see below                                 |

## Operations

All CRUD operations default to **enabled** — omitting the `operations` object, or a specific key, still exposes that
endpoint. Set a key to `false` to disable it.

| Operation  | HTTP Method | Route     | Description                                      |
|------------|-------------|-----------|--------------------------------------------------|
| `findAll`  | `GET`       | `/`       | List all records (paginated)                     |
| `findOne`  | `GET`       | `/:id`    | Get one record by id                             |
| `create`   | `POST`      | `/`       | Create a new record                              |
| `update`   | `PUT`       | `/:id`    | Full replace — all fields required per schema    |
| `patch`    | `PATCH`     | `/:id`    | Partial update — fields optional (auto `.partial()`) |
| `upsert`   | `PUT`       | `/`       | Create or update based on `upsertOn` key(s)      |
| `delete`   | `DELETE`    | `/:id`    | Delete a record                                  |

`upsert` is the exception: it defaults to **disabled** and must be an object with `upsertOn`, not `true`:

```json
{
  "operations": {
    "delete": false,
    "upsert": { "upsertOn": "isbn" }
  }
}
```

Passing `"upsert": true` throws at load time — `upsertOn` (a column name or array of column names used to detect an
existing record) is required.

### PUT vs PATCH

Both `update` and `patch` default to `true`. They share the same Prisma `update()` call — the difference is in
validation:

- **`update` (PUT)** uses the full update schema. All required fields must be present.
- **`patch` (PATCH)** uses `updateSchema.partial()` by default (all fields optional). You can override it by providing an explicit `patch` schema in the resource definition.

In the frontend, **manual save** sends a `PUT` (full replace) and **autosave** sends a `PATCH` (partial update).

Hooks receive `op: 'update'` for PUT calls and `op: 'patch'` for PATCH calls, so `beforeWrite`/`afterWrite` hooks can
distinguish between the two.

## Columns

`columns` accepts either form:

- **Map** (shown in the example above) — keyed by column id; the key becomes the column's `id`.
- **Array** — each entry needs an explicit `id`:

  ```json
  {
    "columns": [
      { "id": "id", "idField": true, "hiddenInForm": true },
      { "id": "title", "searchable": true, "sortable": true }
    ]
  }
  ```

Both forms support the same options:

| Option                                            | Description                                                         |
|---------------------------------------------------|---------------------------------------------------------------------|
| `idField`                                         | Marks the id column                                                 |
| `type`                                            | Data type — a shorthand (`"string"`, `"integer"`, `"boolean"`, `"date"`, …) or a JSON Schema fragment for nested shapes. Optional on a prisma resource (derived from the Zod model); **required on every column of a `kind: "custom"` resource**, see [Custom resources](./custom-resource.md#column-types) |
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
| `fieldView`                                       | Optional per-context override for the read-only view, see below      |
| `fieldTable`                                      | Optional per-context override for the table cell, see below          |

#### Nested object and array columns

A column's `type` may be a full JSON Schema fragment, which is how you describe a
value that is not a scalar:

```json
{
  "metadata": {
    "displayKey": "name",
    "type": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" }
      }
    }
  },
  "tags": {
    "type": { "type": "array", "items": { "type": "string" } }
  }
}
```

An object column renders as a nested group of controls in the form, and — when it
has a `displayKey` — as a single-value record cell in the table.

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

### Field variants — `fieldView` / `fieldTable`

By default a single `fieldInput` drives the form, the read-only view, and the
table cell. A column may additionally declare `fieldView` and/or `fieldTable` to
render differently per context. Both are optional and have the exact same shape
as `fieldInput` (every key optional), so a variant overrides only what it needs.

The config that drives each context is resolved through a fallback chain:

- **form** (and filter) ← `fieldInput`
- **view** ← `fieldView`, falling back to `fieldInput`
- **table** ← `fieldTable`, falling back to `fieldView`, then `fieldInput`

Resolution is a **deep merge, one level into `options`**: a variant layers over
the level below it, so you can tweak a single `options` key without repeating
`format`, `resource`, `relationType`, etc. A value of `null` in a variant
deletes that inherited key.

```json
{
  "column": "author",
  "label": "Author",
  "displayKey": "name",
  "fieldInput": {
    "format": "relation",
    "resource": "./author/resource.json",
    "options": { "display": "autocomplete", "displayKey": "name" }
  },
  "fieldView": {
    "options": { "display": "link" }
  },
  "fieldTable": {
    "options": { "displayKey": "shortName" }
  }
}
```

Here the edit form renders an autocomplete, the read-only view renders a link
(inheriting `displayKey: "name"` from `fieldInput`), and the table cell renders a
link (inherited from `fieldView`) keyed by `shortName`.

Resolution runs once inside the JSON transformer at resource-read time, **after**
relation/URI enrichment, so the resolved `fieldView`/`fieldTable` inherit the
injected relation options. Columns without any variant produce output identical
to today's single-`fieldInput` behaviour. `position` may also be overridden per
variant, giving free per-context ordering.

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

### Foreign key

By default, the foreign key on the child model is derived as `${parentModel}Id` (camelCase), matching the standard Prisma convention. If the FK field in your Prisma schema uses a different name, set `foreignKey` on `fieldInput`:

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

## Display

The `display` object controls how the create/edit form is presented. Both fields are optional.

| Field             | Type                    | Description                                                                 |
|-------------------|-------------------------|-------------------------------------------------------------------------------|
| `mode`            | `'page' \| 'modal'`     | Render the form as a full page or a modal. Default `'modal'`.                |
| `customComponent` | `string \| null`        | Name of a custom Vue component to render instead of the generated form. Default `null`. |

```json
{
  "display": {
    "mode": "page"
  }
}
```

### Page mode

When `mode` is `'page'`, the form renders inline (replacing the table) instead of opening a modal. This happens
automatically — no `inline: true` option needed in `useResources`. The table is hidden while the form is open.

Page mode uses `AutoSaveForm` as its component, which enables autosave by default when editing.

### Custom components

Register a custom Vue component in your app setup and reference it by name in `resource.json`:

```json
{
  "display": {
    "mode": "page",
    "customComponent": "WorkEditor"
  }
}
```

Register the component when creating the Crouton plugin:

```ts
import { CroutonPlugin, customComponentIs } from '@ghentcdh/crouton-vue';
import WorkEditor from './components/WorkEditor.vue';

app.use(
  CroutonPlugin(api, {
    customComponents: [
      {
        tester: customComponentIs('WorkEditor', 1),
        renderer: WorkEditor,
      },
    ],
  }),
);
```

The custom component receives the form configuration as props and is rendered inside the form wrapper.
See the [demo component](../components/) for a working example.

### Custom component fields

For field-level customisation (rendering a single field with a custom component rather than replacing the entire form),
add `customComponent` to `fieldInput.options`. This works with any format — including `relation`:

```json
{
  "column": "section",
  "label": "Sections",
  "fieldInput": {
    "format": "relation",
    "resource": "../section/resource.json",
    "options": {
      "customComponent": "work-sections",
      "sortDir": "section_number",
      "displayKey": "title"
    }
  }
}
```

The component is resolved from the same `customComponents` registry:

```ts
app.use(
  CroutonPlugin(api, {
    customComponents: [
      { tester: customComponentIs('work-sections', 1), renderer: markRaw(WorkSectionsEditor) },
    ],
  }),
);
```

When `customComponent` is present, it takes priority over the default renderer for that format.
The custom field component receives `wrapper`, `value` (v-model), `appliedOptions`, `schema`, and `uischema` as props.
All `fieldInput.options` are available via `appliedOptions`.

#### Table cells

Add `customComponent` to `tableView.options` (or `fieldTable.options`) to override the table cell renderer:

```json
{
  "column": "section_number",
  "fieldInput": {
    "type": "number",
    "position": 0
  },
  "tableView": {
    "options": {
      "customComponent": "moveUpDown"
    }
  }
}
```

The custom cell component receives `data` (full row object), `value` (cell value), `column`, and `options` as props.

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
