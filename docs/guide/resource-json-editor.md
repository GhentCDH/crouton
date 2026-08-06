# Resource JSON Editor

The `ResourceJsonEditor` component from `@ghentcdh/crouton-editor-vue` is a standalone, "dumb" editor for `resource.json` files. It takes the raw resource object as input and emits updated versions — no backend calls, no router, no app context required.

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
- **Columns** — the column table with per-column expand panels for Form/View/Table field variant editing (display key, position, colspan, raw JSON options), plus a **Table / Visual** toggle (see below)
- **JSON** — live read-only preview of the current draft as formatted JSON

### Visual mode (beta)

The Columns tab's **Visual** toggle replaces the flat position/colspan inputs with a drag-and-drop canvas of the actual create/edit form, scoped to non-relation ("standard") fields only — relation columns stay on the Table view. From the canvas you can:

- **Reorder** fields by dragging (rewrites `position`)
- **Resize** a field by dragging its trailing edge (rewrites `options.colspan`, 1–12)
- **Change display type** via each field's "⋯" menu — only same-shape swaps are offered (e.g. text ↔ textarea ↔ markdown, number ↔ integer); shape-changing swaps like select ↔ multi-select aren't included yet
- **Remove** a field from the form (sets `hiddenInForm`, with an undo toast) or **add** one back via the "+ Add field" picker

Everything renders and computes purely client-side — no backend call is made while dragging, resizing, or previewing. Visual mode is new and explicitly marked in-app as still in development; the Table view remains the fallback for anything the canvas doesn't handle yet (relations, unusual raw-JSON options, View/Table context editing).

## Usage

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
