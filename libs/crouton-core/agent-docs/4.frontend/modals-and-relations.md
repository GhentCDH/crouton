# Modals and relations

## Opening a modal programmatically

Use `openFormModal` from `useCrouton` to open a resource's create/edit modal from custom code:

```ts
import { useCrouton } from '@ghentcdh/crouton-vue';

const { openFormModal } = useCrouton();

// Create modal
openFormModal('book');

// Edit modal for a specific record
openFormModal('book', { id: 42 });
```

## DevResourcesPanel

A dev-only panel that lists all registered resources and their status. It is included in the admin sidebar when
`isDev: true` is set on the backend (via `CROUTON_SCHEMA_EDITOR=true`). It renders:

- All registered resources with their load status
- Quick access to the visual resource builder for each resource
- Links to the raw JSON endpoints

## Relation controls

Crouton provides two relation display components for use in custom views:

### RelationButton

Renders a relation as a button that opens the related resource's form in a modal.

```vue
<template>
  <RelationButton :resource="'author'" :record-id="book.authorId" />
</template>

<script setup>
import { RelationButton } from '@ghentcdh/crouton-vue';
</script>
```

### RelationInline

Renders a relation inline (as a nested table/list) rather than as a modal.

```vue
<template>
  <RelationInline :resource="'chapter'" :parent-id="book.id" />
</template>

<script setup>
import { RelationInline } from '@ghentcdh/crouton-vue';
</script>
```

Both components are most useful in custom form components (registered via `display.customComponent`). In `resource.json`
the built-in relation renderer is selected automatically based on `relationType` — `RelationButton` for `manyToOne` and
`RelationInline` for `oneToMany`.

See [Custom renderers](custom-renderers.md) for how to register a custom page-level component.
