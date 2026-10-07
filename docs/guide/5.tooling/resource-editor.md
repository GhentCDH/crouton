# Resource editor

Two dev-mode tools for editing `resource.json` files without hand-editing JSON or running the CLI.

Everything in this page is gated behind dev mode and never active in production.

## Visual builder (in-app)

A dev-only panel built into the admin UI. Enable it on the backend:

```sh
CROUTON_SCHEMA_EDITOR=true
```

Accepted truthy values: `true`, `1`, `yes` (case-insensitive). Anything else is treated as `false`. There is no
`NODE_ENV` fallback: the flag must be set explicitly.

The backend serves this as `isDev` on `/_app/layout`. The frontend reads it once via `useCrouton()` and exposes it as
`isDev`; the edit button and the "Dev tools" sidebar link only render when the connected backend reports `isDev: true`.

### Editing fields

Every resource table gets an **Edit fields** button next to **Add record** when dev mode is on. It opens a modal listing
each column with `label`, `column`, and visibility checkboxes (`hiddenInTable`/`hiddenInForm`/`hiddenInView`), plus an
expandable row per column with a **Form** / **View** / **Table** tab for editing that context's field config.

Each tab shows `displayKey`, `position`, and (Form/View only) `colspan` as dedicated inputs, plus a raw-JSON field for
anything else in `options`. `colspan` is a 0–12 select (`12` reads as "Full", and is the default).

On View/Table, the values shown are the _resolved_ ones (what will actually render, falling back through the chain),
and each dedicated input has a reset (`×`) button that clears it back to inherited rather than pinning a copy.

A tab is hidden entirely when that context's `hiddenInTable`/`hiddenInForm`/`hiddenInView` checkbox is on.

Saving sends a `PATCH` to `<route>/resource.json` with only the fields that changed, at whichever level they were
changed — untouched keys are never rewritten. The merge reuses the same `mergeFieldVariant` that resolves the fallback
chain everywhere else. The frontend then invalidates that resource's cached form definition so the table, form, and view
reflect the change immediately without a reload.

### Dev tools panel

A **Dev tools** entry appears in the admin sidebar when dev mode is on, with three independent flows:

#### Pull schema from database

Runs `prisma db pull` → `prisma-case-format` → `prisma generate` against the live database. This is the one action
here that needs real database credentials on the running backend and mutates `schema.prisma` directly.

`schema.prisma` is backed up to `schema.prisma.bak` first. If it has uncommitted changes, the endpoint returns
`requiresConfirmation` instead of pulling, and the panel asks you to confirm.

After pulling, a **Restart backend now** button calls `POST /_app/resources/restart`, which disconnects every
datasource's Prisma client and then exits the process (`process.exit(1)`). That only actually restarts anything if
this process is supervised (nodemon, nest start --watch, pm2, a Docker restart policy, etc.).

#### Generate from database

Lists Prisma models that don't have a resource yet. Clicking **Generate** for a model writes a brand-new `resource.json`
for it (map-form columns, the same defaults `crouton update resources` applies).

#### Reload from database

For resources that already exist, this mirrors the CLI's reconciliation flow:

1. **Check for changes** — diffs every resource against the current schema and shows what would change, without writing.
2. Review the plan and pick which resources to apply.
3. **Apply selected** — writes only the chosen resources.

### Backend endpoints

All of the following return `403` unless `CROUTON_SCHEMA_EDITOR` is enabled.

| Endpoint                   | Method  | Description                                                                                                 |
|----------------------------|---------|-------------------------------------------------------------------------------------------------------------|
| `<route>/resource-columns` | `GET`   | Editable column list for one resource.                                                                      |
| `<route>/resource.json`    | `PATCH` | Merge a column patch into that resource's `resource.json`.                                                  |
| `<route>/resource-json-raw`| `GET`   | Raw resource.json for the `ResourceJsonEditor` component.                                                   |
| `<route>/resource-json-raw`| `PUT`   | Save a resource.json from the `ResourceJsonEditor` component.                                               |
| `/_app/resources/models`   | `GET`   | Prisma models, whether each has a resource, and whether the running backend's Prisma client can use it yet. |
| `/_app/resources/pull`     | `POST`  | `db pull` + case-format + `generate` for a datasource; needs DB credentials.                                |
| `/_app/resources/restart`  | `POST`  | Disconnects datasources and exits the process; needs an external supervisor to actually restart it.         |
| `/_app/resources/sync`     | `POST`  | Generate a `resource.json` for a single model.                                                              |
| `/_app/resources/plan`     | `POST`  | Diff resources (all or selected) against the database; dry run.                                             |
| `/_app/resources/apply`    | `POST`  | Write the resources chosen from a `plan` response.                                                          |

## ResourceJsonEditor component

The `ResourceJsonEditor` component from `@ghentcdh/crouton-editor-vue` is a standalone, "dumb" editor for
`resource.json` files. It takes the raw resource object as input and emits updated versions — no backend calls, no
router, no app context required.

### Props & Emits

| Prop         | Type                | Description                                               |
| ------------ | ------------------- | --------------------------------------------------------- |
| `modelValue` | `ResourceJsonInput` | The raw resource.json object (no schema defaults applied) |

| Event               | Payload             | Description                                |
| ------------------- | ------------------- | ------------------------------------------ |
| `update:modelValue` | `ResourceJsonInput` | Emitted on every edit (v-model compatible) |
| `save`              | `ResourceJsonInput` | Emitted for explicit save actions          |

### Sections

The editor organizes editing into three tabs:

- **Settings** — resource-level fields: title, display mode, modal size, sidebar config, operations, and an expandable
  "Advanced" section for structural fields (route, model, tag, etc.)
- **Columns** — the column table with per-column expand panels for Form/View/Table field variant editing (display key,
  position, colspan, raw JSON options), plus **Form / View / Columns** visual mode toggles (see below)
- **JSON** — live read-only preview of the current draft as formatted JSON

### Visual modes (beta)

The Columns tab has four view modes: **Table** (the original flat editor), **Form**, **View**, and **Columns**. The
last three are drag-and-drop visual canvases, each scoped to non-relation ("standard") fields only — relation columns
stay on the Table view.

- **Form canvas** — Drag-and-drop to reorder (rewrites `position`), drag trailing edge to resize (rewrites `options.colspan`, 1–12), "⋯" menu to change display type, Remove/Add field
- **View canvas** — Same grid-based canvas, operates on `hiddenInView` and `fieldView` variants
- **Columns canvas** — Horizontal strip of column chips for editing the Table context. Reorder-only for now.

All three canvases render purely client-side — no backend call while dragging or previewing.

### Usage

```vue
<script setup>
import { ref } from 'vue';
import { ResourceJsonEditor } from '@ghentcdh/crouton-editor-vue';

const resource = ref({
  name: 'book',
  route: 'books',
  model: 'Book',
  tag: 'Books',
  title: 'Books',
  operations: {
    findAll: true, findOne: true, create: true, update: true, patch: true, delete: true,
  },
  columns: {
    title: { label: 'Title', column: 'title' },
    author: { label: 'Author', column: 'author' },
    year: { label: 'Year', column: 'year' },
  },
});

const onUpdate = (value) => { resource.value = value; };
</script>

<template>
  <ResourceJsonEditor :model-value="resource" @update:model-value="onUpdate" />
</template>
```

### Integration in crouton-vue

When used inside the crouton app, `ResourceSchemaEditor.vue` wraps the editor in a modal and handles:

1. Fetching the raw resource.json via `GET <route>/resource-json-raw`
2. Saving via `PUT <route>/resource-json-raw`
3. Invalidating the cached form definition after save

The editor component itself knows nothing about these endpoints — the host app wires them up.
