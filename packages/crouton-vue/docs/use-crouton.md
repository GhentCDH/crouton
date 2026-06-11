# useCrouton

The `useCrouton` composable is the data backbone of the crouton components: it loads the resource schemas from the API (`/schemas` endpoints), and exposes the CRUD state (items, pagination, filters, selected entity) plus the actions to mutate it.

```ts
import { useCrouton } from '@ghentcdh/crouton-vue';
```

<!-- TODO: document the returned state & actions in detail -->
