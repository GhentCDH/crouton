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

| Field               | Type                           | Description                                                                                                                                                                                   |
|---------------------|--------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `$schema`           | `string`                       | URL of the generated JSON Schema, for editor autocomplete — see [Versioning](versioning.md#schema-and-stamping)                                                                      |
| `schemaVersion`     | `number`                       | resource.json shape version; auto-migrated in dev — see [Versioning](versioning.md)                                                                                                  |
| `draft`             | `boolean`                      | When `true`, kept in the repo but not loaded/served — see [Draft resources](versioning.md#draft-resources)                                                                             |
| `kind`              | `'prisma' \| 'custom'`         | Where the data comes from. Default `prisma`. `custom` means no Prisma model and no `schema.ts` — you implement data access in `repository.ts`, see [Custom resources](custom-resource.md)     |
| `idType`            | `'string' \| 'number'`         | Type of the id field. Default `'number'`. Use `'string'` for UUID primary keys.                                                                                                               |
| `name`              | `string`                       | Unique resource name (used as form id in the frontend)                                                                                                                                        |
| `id`                | `string`                       | Internal id; `route` falls back to it when omitted, and it falls back to `name`. Rarely set by hand                                                        |
| `route`             | `string`                       | URL segment for the generated endpoints                                                                                                                                                       |
| `model`             | `string`                       | Prisma model name. Required when `kind` is `prisma`; must be omitted when `kind` is `custom`                                                                                                  |
| `tag`               | `string`                       | OpenAPI tag (default `Crouton`)                                                                                                                                                                                   |
| `title`             | `string`                       | Display title in the UI                                                                                                                                                                       |
| `table`             | `string`                       | Database table (when it differs from the model)                                                                                                                                               |
| `database`          | `string`                       | Name of the [data source](../3.backend/data-sources.md) to use                                                                                                                                 |
| `parent`            | object                         | Mount this resource under a parent route: `{ "route": "groups", "param": "groupId" }`. Custom resources only — see [Custom resources](custom-resource.md#as-a-standalone-nested-route-parent) |
| `sidebar`           | object                         | Sidebar visibility, ordering, and grouping — see [Sidebar](#sidebar)                                                                                                                          |
| `display`           | object                         | `mode` (`'page'` \| `'modal'`, default `'modal'`) and `customComponent`, see [Display](#display)                                                                                              |
| `operations`        | object                         | Enable `findAll`, `findOne`, `create`, `update`, `patch`, `delete` — see [Operations](operations.md)                                                                                                                            |
| `security`          | object                         | Per-resource authorization guard(s) — see [Security](security.md)                                                                                          |
| `columns`           | map or array                   | Column definitions, see [Columns](columns.md)                                                                                                                                                                 |
| `calculatedColumns` | array                          | SQL-computed read-only columns, see [Columns](columns.md#calculated-columns)                                                                                                                                                     |
| `actions`           | array                          | Row-level [actions](actions.md)                                                                                                                                                               |
| `tableActions`      | array                          | Table-level [actions](actions.md)                                                                                                                                                               |
| `modalSize`         | `'xs' \| 'sm' \| 'lg' \| 'xl'` | Size of the create/edit modal (default `sm`)                                                                                                                                                                 |
| `include`           | array                          | Relations to eagerly load, see [Columns](columns.md#includes)                                                                                                                                          |
| `layout`            | object                         | Form layout configuration — controls column spans and section grouping — see [Layout](layout.md)                                                                                                                         |

## Operations

All CRUD operations default to **enabled** — omitting the `operations` object, or a specific key, still exposes that
endpoint. Set a key to `false` to disable it.

| Operation | HTTP Method | Route  | Description                                          |
|-----------|-------------|--------|------------------------------------------------------|
| `findAll` | `GET`       | `/`    | List all records (paginated)                         |
| `findOne` | `GET`       | `/:id` | Get one record by id                                 |
| `create`  | `POST`      | `/`    | Create a new record                                  |
| `update`  | `PUT`       | `/:id` | Full replace — all fields required per schema        |
| `patch`   | `PATCH`     | `/:id` | Partial update — fields optional (auto `.partial()`) |
| `delete`  | `DELETE`    | `/:id` | Delete a record                                      |

See [Operations](operations.md) for external operations, per-op security, and PUT vs PATCH details.

## Display

The `display` object controls how the create/edit form is presented. Both fields are optional.

| Field             | Type                | Description                                                                             |
|-------------------|---------------------|-----------------------------------------------------------------------------------------|
| `mode`            | `'page' \| 'modal'` | Render the form as a full page or a modal. Default `'modal'`.                           |
| `customComponent` | `string \| null`    | Name of a custom Vue component to render instead of the generated form. Default `null`. |

```json
{
  "display": {
    "mode": "page"
  }
}
```

When `mode` is `'page'`, the form renders inline (replacing the table) instead of opening a modal. Page mode uses
`CroutonForm` with autosave enabled by default when editing.

To replace the entire form with a custom Vue component, set `display.customComponent` to the component's registered
name. See [Custom renderers](../4.frontend/custom-renderers.md) for how to register it.

## Sidebar

The `sidebar` object controls how (and whether) a resource appears in the admin navigation. All fields are optional.

| Field      | Type      | Description                                                                                                                                        |
|------------|-----------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| `hide`     | `boolean` | Exclude this resource from the sidebar entirely (default `false`)                                                                                  |
| `position` | `number`  | Order within its group or at the top level. Lower values come first; resources without a position are sorted alphabetically after positioned ones. |
| `label`    | `string`  | Override the sidebar label. Defaults to the resource `title`.                                                                                      |
| `group`    | `string`  | Slug of a group defined in `sidebarGroups` in `crouton.json`. Resources with the same `group` are nested under a shared collapsible section.       |

Group labels and ordering are configured centrally in `crouton.json` under `sidebarGroups`, keyed by slug:

```json
{
  "sidebarGroups": {
    "metadata": {
      "label": "Metadata",
      "position": 10
    }
  }
}
```

Resources reference them by key:

```json
{
  "name": "author",
  "sidebar": { "label": "Authors", "group": "metadata", "position": 1 }
}
```

See [crouton.json reference](../reference/crouton-json.md) for all `sidebarGroups` fields.

## Escape hatch: resource.ts

When JSON is not expressive enough, replace `resource.json` with a `resource.ts` that default-exports a full
`ResourceConfig` object. The loader falls back to it automatically when no `resource.json` is present.
