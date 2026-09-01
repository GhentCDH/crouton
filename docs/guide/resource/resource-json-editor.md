# Resource JSON Editor

The `ResourceJsonEditor` component from `@ghentcdh/crouton-vue` is a standalone, "dumb" editor for `resource.json` files. It takes the raw resource object as input and emits updated versions — no backend calls, no router, no app context required.

## Live preview

<ResourceJsonEditorDemo />

## Props & Emits

| Prop         | Type                | Description                                               |
| ------------ | ------------------- | --------------------------------------------------------- |
| `modelValue` | `ResourceJsonInput` | The raw resource.json object (no schema defaults applied) |

| Event               | Payload             | Description                                |
| ------------------- | ------------------- | ------------------------------------------ |
| `update:modelValue` | `ResourceJsonInput` | Emitted on every edit (v-model compatible) |
| `save`              | `ResourceJsonInput` | Emitted for explicit save actions          |

## Sections

The editor organizes editing into three tabs:

- **Settings** — resource-level fields: title, display mode, modal size, sidebar config, operations, and an expandable "Advanced" section for structural fields (route, model, tag, etc.)
- **Columns** — the column table with per-column expand panels for Form/View/Table field variant editing (display key, position, colspan, raw JSON options), plus **Form / View / Columns** visual mode toggles (see below)
- **JSON** — live read-only preview of the current draft as formatted JSON

### Visual modes (beta)

The Columns tab has four view modes: **Table** (the original flat editor), **Form**, **View**, and **Columns**. The last three are drag-and-drop visual canvases, each scoped to non-relation ("standard") fields only — relation columns stay on the Table view.

#### Form canvas

Drag-and-drop canvas of the create/edit form layout:

- **Reorder** fields by dragging (rewrites `position`)
- **Resize** a field by dragging its trailing edge (rewrites `options.colspan`, 1–12)
- **Change display type** via each field's "⋯" menu — only same-shape swaps are offered (e.g. text ↔ textarea ↔ markdown, number ↔ integer); shape-changing swaps like select ↔ multi-select aren't included yet
- **Remove** a field from the form (sets `hiddenInForm`, with an undo toast) or **add** one back via the "+ Add field" picker

#### View canvas

Same grid-based canvas as Form, but editing the **View** (read-only detail page) context instead. Operates on `hiddenInView` and `fieldView` variants. Shares all the same interactions (reorder, resize, change type, remove/add).

#### Columns (Table) canvas

A horizontal strip of column chips for editing the **Table** (list page) context. Reorder-only for now — no column width editing. Operates on `hiddenInTable` and `fieldTable` variants.

All three canvases render and compute purely client-side — no backend call is made while dragging, resizing, or previewing. Visual modes are new and explicitly marked in-app as still in development; the Table view remains the fallback for anything the canvases don't handle yet (relations, unusual raw-JSON options).

## Usage

```vue
<script setup>
import { ref } from 'vue';
import { ResourceJsonEditor } from '@ghentcdh/crouton-vue';

const resource = ref({
  name: 'book',
  route: 'books',
  model: 'Book',
  tag: 'Books',
  title: 'Books',
  operations: {
    findAll: true,
    findOne: true,
    create: true,
    update: true,
    patch: true,
    delete: true,
  },
  columns: {
    title: { label: 'Title', column: 'title' },
    author: { label: 'Author', column: 'author' },
    year: { label: 'Year', column: 'year' },
  },
});

const onUpdate = (value) => {
  resource.value = value;
};
</script>

<template>
  <ResourceJsonEditor :model-value="resource" @update:model-value="onUpdate" />
</template>
```

## Integration in crouton-vue

When used inside the crouton app, `ResourceSchemaEditor.vue` wraps the editor in a modal and handles:

1. Fetching the raw resource.json via `GET <route>/resource-json-raw`
2. Saving via `PUT <route>/resource-json-raw`
3. Invalidating the cached form definition after save

The editor component itself knows nothing about these endpoints — the host app wires them up.
