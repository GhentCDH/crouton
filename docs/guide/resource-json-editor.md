# Resource JSON Editor

The `ResourceJsonEditor` component from `@ghentcdh/crouton-editor-vue` is a standalone, "dumb" editor for `resource.json` files. It takes the raw resource object as input and emits updated versions — no backend calls, no router, no app context required.

## Props & Emits

| Prop | Type | Description |
|------|------|-------------|
| `modelValue` | `ResourceJsonInput` | The raw resource.json object (no schema defaults applied) |

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `ResourceJsonInput` | Emitted on every edit (v-model compatible) |
| `save` | `ResourceJsonInput` | Emitted for explicit save actions |

## Sections

The editor organizes editing into three tabs:

- **Settings** — resource-level fields: title, display mode, modal size, sidebar config, operations, and an expandable "Advanced" section for structural fields (route, model, tag, etc.)
- **Columns** — the column table with per-column expand panels for Form/View/Table field variant editing (display key, position, colspan, raw JSON options)
- **JSON** — live read-only preview of the current draft as formatted JSON

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
  operations: { findAll: true, findOne: true, create: true, update: true, patch: true, delete: true },
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
