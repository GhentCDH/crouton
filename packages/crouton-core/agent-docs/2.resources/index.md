---
description: Complete reference for resource.json — the single file that drives API endpoints, validation, table columns, form fields, and filters for a Crouton resource.
---

# resource.json

Each resource is described by a `resource.json` file in its own directory under `resources/`. This one file drives the
API endpoints, validation wiring, table columns, form fields, and filters.

## A complete example

```json
{
  "name": "book",
  "source": {
    "model": "book",
    "datasource": "maindb"
  },
  "route": "books",
  "tag": "Book",
  "title": "Books",
  "sidebar": {
    "position": 1,
    "label": "Books",
    "group": "catalogue"
  },
  "operations": {
    "findAll": {
      "search": [
        "title"
      ]
    },
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
      "creatable": false,
      "updatable": false
    }
  }
}
```

## Top-level fields

| Field | Type | Description |
|-------|------|-------------|
| `$schema` | `string` | URL of the generated JSON Schema, for editor autocomplete — see [Versioning](versioning.md#schema-and-stamping) |
| `schemaVersion` | `number` | resource.json shape version; auto-migrated in dev — see [Versioning](versioning.md) |
| `draft` | `boolean` | When `true`, kept in the repo but not loaded/served — see [Draft resources](versioning.md#draft-resources) |
| `kind` | `'prisma' \| 'custom'` | Where the data comes from. Default `prisma`. `custom` means no Prisma model and no `schema.ts` — see [Custom resources](custom-resource.md) |
| `name` | `string` | Unique resource name. Also the resource id (frontend form id) and the default `route` |
| `route` | `string` | URL segment for the generated endpoints. Defaults to `name` |
| `source` | object | `model` (Prisma model; required for `prisma`, absent for `custom`), `dbTable`, `datasource` ([data source](../3.backend/data-sources.md) name), `idType` (`'string'` \| `'number'`, default `'string'`) |
| `title` | `string` | Display title in the UI. Defaults to a title-cased `name` |
| `openapi` | object | `tag` (OpenAPI tag) and `description` (tag description, applied by `applyResourceTagDescriptions` from `@ghentcdh/crouton-api`) |
| `tag` | `string` | OpenAPI tag (default `Crouton`). Prefer `openapi.tag` |
| `parent` | object | Mount this resource under a parent route: `{ "route": "groups", "param": "groupId" }`. Custom resources only — see [Custom resources](custom-resource.md#as-a-standalone-nested-route-parent) |
| `sidebar` | object | Sidebar visibility, ordering, and grouping — see [Sidebar](#sidebar) |
| `operations` | object | Enable `findAll`, `findOne`, `create`, `update`, `patch`, `delete`; `findAll.search` / `filter` / `include` — see [Operations](operations.md) |
| `security` | object | Per-resource authorization guard(s) — see [Security](security.md) |
| `columns` | map | Column definitions keyed by id. Unknown keys inside a column fail validation — see [Columns](columns.md) |
| `lookup` | object | How this resource is labelled in other resources' dropdowns (`labels`, `separator`) |
| `layout` | object | Form, view and table layout, including row/table actions and the modal/page container — see [Layout](layout.md) |

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

Set the presentation on `layout.form.container` / `layout.view.container` (the root `display` key was removed — see
[Layout](layout.md#how-a-record-opens-layout-form-view-container)). The fields below describe the container.

| Field             | Type                | Default    | Description                                                                                      |
|-------------------|---------------------|------------|--------------------------------------------------------------------------------------------------|
| `mode`            | `'page' \| 'modal'` | `'modal'`  | Render the form inline on the page or in a pop-up modal.                                         |
| `customComponent` | `string \| null`    | `null`     | Name of a registered custom Vue component to render alongside the form. See below.               |

### `mode: "modal"` (default)

Clicking a row or **Add** opens a modal dialog. The table stays visible behind it. `modalSize` controls the dialog
width (`xs` / `sm` / `lg` / `xl`, default `sm`).

### `mode: "page"`

```json
{
  "display": {
    "mode": "page"
  }
}
```

Clicking a row or **Add** hides the table and renders `CroutonForm` inline on the same page. Closing the form brings
the table back. Both edit and view (read-only) actions use the inline form in page mode — no separate view modal opens.

Use page mode when the record has many fields, needs a rich layout, or when you want to show extra content alongside
the form (see `customComponent` below).

### `display.customComponent`

Set to the name of a Vue component registered in `CroutonPlugin({ customComponents })`. When set, the component is
rendered **after** the form (in the `#content-after` slot), receiving the `resource` object and all form config as
props.

```json
{
  "display": {
    "mode": "page",
    "customComponent": "BalanceStats"
  }
}
```

Register the component the same way as any other custom component:

```ts
import { customComponentIs, type CustomComponentEntry } from '@ghentcdh/crouton-vue';
import { markRaw } from 'vue';
import BalanceStats from './BalanceStats.vue';

export const customComponents: CustomComponentEntry[] = [
  { tester: customComponentIs('BalanceStats', 10), renderer: markRaw(BalanceStats) },
];
```

The component receives:

| Prop       | Type         | Description                                                                                 |
|------------|--------------|---------------------------------------------------------------------------------------------|
| `resource` | `Resource`   | Resource instance — has `loadData`, `getOneById`, `save`, `create`, `delete`, `closeForm` |
| form config props | various | Same props bound to the form component (form data, schema, etc.)                    |

`customComponent` works in both `modal` and `page` mode, but is most useful combined with `mode: "page"` where the
extra content sits naturally beside the form. See [Custom renderers](../4.frontend/custom-renderers.md) for the full
registration API.

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
