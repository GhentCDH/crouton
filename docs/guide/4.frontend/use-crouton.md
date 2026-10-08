# useCrouton

The `useCrouton` composable exposes the global crouton state initialized by `CroutonPlugin`. Use it in any Vue component
after the plugin is registered.

```ts
import { useCrouton } from '@ghentcdh/crouton-vue';
```

## Reactive state

```ts
const crouton = useCrouton();

crouton.title    // ComputedRef<string>
crouton.version  // ComputedRef<string>
crouton.sidebar  // SidebarNode[] (reactive getter)
crouton.isDev    // boolean — true when backend reports CROUTON_SCHEMA_EDITOR=true
```

## `getFormDefById`

Fetch (and cache) the compiled form definition for a resource by its route id:

```ts
const crouton = useCrouton();

const formDef = await crouton.getFormDefById('book');
// → GET /book/schemas, result cached per language
// formDef.schemas.table / .form / .view / .filter
// formDef.operations   — endpoint map (findAll, findOne, create, update, patch, delete)
// formDef.idField      — primary key field name
```

For sub-resources or nested routes, pass the full path segment:

```ts
const formDef = await crouton.getFormDefById('balance/stats');
// → GET /balance/stats/schemas
```

`getFormByUri` fetches by an arbitrary URI instead of a route id. `invalidateFormDef(id)` drops the cache entry for
a specific resource; `invalidateAllFormDefs()` clears the entire cache (called automatically on language change).

::: tip
`getFormDef` is a deprecated alias for `getFormDefById`. Use `getFormDefById`.
:::

## `resourceApi`

`resourceApi` turns a `FormDef` into a typed set of API methods. Use it when you need to call a resource endpoint
outside of the standard table/form UI — custom pages, stats aggregations, parent-scoped sub-resources.

```ts
import { resourceApi } from '@ghentcdh/crouton-vue';

const crouton = useCrouton();
const formDef = await crouton.getFormDefById('balance/stats');

// Pass URI param defaults — merged into every request for this instance.
// Use { parent: { id: '...' } } for nested routes that expect a parent id.
const api = resourceApi(formDef, { parent: { id: balanceId } });
```

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `loadData` / `findAll` | `(requestData, signal?) → Promise<PagedResult \| null>` | `GET` list — maps to the `findAll` operation |
| `getOneById` | `(id) → Promise<Record \| null>` | `GET` single record — maps to `findOne` |
| `create` | `(data) → Promise<Record \| null>` | `POST` — maps to `create` |
| `save` | `(id, data) → Promise<Record \| null>` | `PUT` — maps to `update` |
| `patch` | `(id, data) → Promise<Record \| null>` | `PATCH` — maps to `patch` |
| `delete` | `(data) → Promise<unknown \| null>` | `DELETE` — maps to `delete` |
| `checkUnique` | `(field, value, excludeId?, scope?) → Promise<boolean>` | Uniqueness check via `GET .../unique` |

All methods return `null` on error (toast notification shown automatically). `loadData` and `findAll` are the same
function — `findAll` is the alias.

### Example: sub-resource stats

```ts
const getStats = async (balanceId: string) => {
  const formDef = await crouton.getFormDefById('balance/stats');
  const api = resourceApi(formDef, { parent: { id: balanceId } });
  const data = await api.loadData({});

  const first = data?.data[0] ?? { groupTotal: 0 };
  return { allBalance: data?.data, groupBalance: { total: first.groupTotal } };
};
```

`defaultUriParams` passed to `resourceApi` are merged with any per-call params. URI template placeholders like
`{parent.id}` in the resource's operation URIs are replaced with the matching key from `defaultUriParams`.

### `croutonApiCall`

Lower-level escape hatch — call a specific operation by name directly:

```ts
import { croutonApiCall } from '@ghentcdh/crouton-vue';

await croutonApiCall(formDef, 'findAll', { parent: { id: '123' } }, { params: {} });
```

Use `resourceApi` unless you need an operation not covered by its methods.

## `setDefault`

Update a dynamic default token at runtime (e.g. after fetching the current user):

```ts
const crouton = useCrouton();

onMounted(async () => {
  const user = await fetchCurrentUser();
  crouton.setDefault('$user', user);
});
```

The new value is used the next time a create form opens. See [Columns → defaultValue](../2.resources/columns.md#defaultvalue--pre-filling-the-create-form).

## `openFormModal`

Open a resource's create/edit modal programmatically:

```ts
const { openFormModal } = useCrouton();

// Open create modal for books
openFormModal('book');

// Open edit modal for a specific book
openFormModal('book', { id: 42 });
```

## `useResourcesById` / `useResourcesByUri`

Composables that provide typed CRUD access to a resource by its `name` or `route`:

```ts
import { useResourcesById, useResourcesByUri } from '@ghentcdh/crouton-vue';

const bookApi = useResourcesById('book');   // keyed by resource name
const bookApi2 = useResourcesByUri('books'); // keyed by route

// CRUD methods
const list = await bookApi.findAll({ page: 1, pageSize: 20 });
const record = await bookApi.findOne(42);
const created = await bookApi.create({ title: 'New Book' });
await bookApi.save(42, { title: 'Updated Title' });
await bookApi.delete(42);
```

## `loadRuntimeConfig`

Re-fetch `/_app/layout` after a configuration change without reloading the page:

```ts
const { loadRuntimeConfig } = useCrouton();
await loadRuntimeConfig();
```

## `useLanguage`

Access and control the active language (available when translations are configured):

```ts
import { useLanguage } from '@ghentcdh/crouton-vue';

const { language, languages, setLanguage, t } = useLanguage();

// Change language programmatically
await setLanguage('nl');

// Look up a ui dictionary key
const label = t('actions.save'); // "Opslaan"
```

`setLanguage` updates the reactive ref, persists to `localStorage`, and triggers a layout + FormDef refresh
automatically. See [Translations](translations.md) for the full i18n setup.

## `CROUTON_FORM` / `CROUTON_STATUS` — named routes

Named route constants for programmatic navigation:

```ts
import { CROUTON_FORM, CROUTON_STATUS } from '@ghentcdh/crouton-vue';

router.push({ name: CROUTON_FORM, params: { formId: 'book' } });
router.push({ name: CROUTON_STATUS });
```

## AppConfig fields

`CroutonPlugin(api, options)` accepts:

| Field               | Type                                  | Default     | Description                                                                          |
|---------------------|---------------------------------------|-------------|--------------------------------------------------------------------------------------|
| `title`             | `string`                              | from backend | Frontend override for the app title.                                                |
| `router`            | `Router`                              | —           | Vue Router instance — registers crouton routes (status page, etc.)                   |
| `showErrors`        | `boolean`                             | `false`     | Show raw validation errors below every `CroutonForm`.                               |
| `debugValue`        | `boolean`                             | `false`     | Show live form values below every `CroutonForm` for debugging.                       |
| `autoSave`          | `boolean`                             | `false`     | Enable autosave globally for all `CroutonForm` instances.                            |
| `defaults`          | `Record<string, unknown>`             | `{}`        | Default form values injected for `$user` and other dynamic tokens.                   |
| `isDev`             | `boolean`                             | `false`     | Enable dev-only features (resource editor, publish button, etc.)                     |
| `renderers`         | `JsonFormsRendererRegistryEntry[]`    | `[]`        | Extra control renderers merged on top of the built-ins in form/edit modals.          |
| `readonlyRenderers` | `JsonFormsRendererRegistryEntry[]`    | `[]`        | Extra renderers for view (readonly) modals only.                                     |
| `cellRenderers`     | `CellRendererEntry[]`                 | `[]`        | Extra table cell renderers.                                                          |
| `customComponents`  | `CustomComponentEntry[]`              | `[]`        | Custom Vue components for page-level display and custom format fields.               |
| `VERSION`           | `string`                              | `'unknown'` | App version shown in the UI.                                                         |

### Title precedence

1. Explicit `title` in `CroutonPlugin` options — highest priority.
2. `title` returned by `GET /_app/layout` from the backend.
3. Default `'Crouton'` fallback.

In most cases, set the title in the backend `CroutonApiModule` config and leave it out of the plugin options.
