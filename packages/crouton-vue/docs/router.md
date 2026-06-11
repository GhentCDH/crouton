# Router

`CroutonRouter` exports the route definitions for the crouton admin views.

```ts
import { CroutonRouter, CROUTON_FORM } from '@ghentcdh/crouton-vue';
```

| Export | Description |
| --- | --- |
| `CroutonRouter` | Route array — mount it under any parent path |
| `CROUTON_PREFIX` | `'crouton'` — route-name prefix |
| `CROUTON_FORM` | `'crouton/form'` — named route for a resource form view |

The route `form/:formId` renders `AdminView` with the schema-driven form for the resource identified by `formId`.

::: tip
Navigate by name: `router.push({ name: CROUTON_FORM, params: { formId: 'author' } })`.
:::
