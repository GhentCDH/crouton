# Crouton Vue

`@ghentcdh/crouton-vue` renders complete admin UIs — data tables, forms, filters, and relation editors — driven entirely by the schemas exposed by `@ghentcdh/crouton-api`.

## Installation

```sh
pnpm add @ghentcdh/crouton-vue
```

Peer dependencies: `vue` (>=3), `vue-router` (>=4), `axios`, `@jsonforms/core`, `@ghentcdh/ui`, `@ghentcdh/json-forms-vue`, `zod`.

Import the styles of `@ghentcdh/ui` once in your application entry:

```ts
import '@ghentcdh/ui/index.css';
```

## Quick start

Mount the crouton router and let the components fetch their schemas:

```ts
import { CroutonRouter } from '@ghentcdh/crouton-vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/admin',
      children: CroutonRouter,
    },
  ],
});
```

Navigating to `/admin/form/<resource>` renders the full admin view (table + filters + forms) for that resource — no extra configuration.

## Topics

- [Router](./router.md) — routes and navigation helpers
- [useCrouton](./use-crouton.md) — the composable that loads schemas and exposes CRUD state
- [Form](./form.md) — schema-driven forms and the form modal
- [Table](./table.md) — data table with cells, pagination, and sorting
- [Relations](./relations.md) — editing and displaying related resources
