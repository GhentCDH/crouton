# Table

The data table renders the list view of a resource: columns, cell renderers, sorting, pagination, and filters all derive from the table schema served by `@ghentcdh/crouton-api`.

- **Cells** — built-in cell renderers per column type (text, relation, …).
- **Pagination & sorting** — wired to the list endpoint's request model.
- **Filters** — filter controls generated from the resource's filterable columns.

## ResourceTable props

| Prop | Type | Default | Description |
|---|---|---|---|
| `formId` | `string` | — | ID of the resource form definition to load. |
| `label` | `string` | — | Override the title shown in the toolbar/legend. |
| `initialRequestParams` | `object` | `{}` | Query params merged into the initial list request. |
| `defaultUriParams` | `object` | `{}` | URI params merged into every API request. |
| `hideToolbar` | `boolean` | `false` | Replace the full toolbar with a compact legend bar. |
| `tableComponent` | `Component` | `TableComponent` | Custom Vue component to render instead of the built-in table. |

## Custom table component

Pass any Vue component via `:table-component` to replace the default `TableComponent`. The custom component receives the same props as `TableComponent` (spread from the resource object) plus an `id` attribute and a `@refresh` event.

```vue
<ResourceTable
  form-id="authors"
  :table-component="MyCustomTable"
/>
```

The custom component receives:

| Prop / event | Description |
|---|---|
| `id` | Unique DOM id for the table element. |
| `...resource` | All resource state (rows, pagination, columns, …) spread as props. |
| `@refresh` | Emitted by the toolbar pagination/sort controls — call `reload()` in response. |

A minimal custom table component:

```vue
<script setup lang="ts">
defineProps({
  // receive whatever props from the resource you need
  rows: { type: Array, default: () => [] },
});

defineEmits(['refresh']);
</script>

<template>
  <ul>
    <li v-for="row in rows" :key="row.id">{{ row }}</li>
  </ul>
</template>
```

<!-- TODO: add live demos once mocked schema data is available in the docs site -->