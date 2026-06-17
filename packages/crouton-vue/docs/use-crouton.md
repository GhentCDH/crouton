# useCrouton

The `useCrouton` composable is the entry point for wiring up the crouton admin panel. It configures the API, loads the application layout from the backend, and holds global state (sidebar, title, version) and any consumer-registered renderers.

```ts
import { useCrouton } from '@ghentcdh/crouton-vue';
```

## Initialisation

Call `init()` once at application startup, before mounting the Vue app:

```ts
useCrouton().init(useApi(), {
  VERSION: env.VERSION,
})
```

`init()` signature:

```ts
init(api: AxiosInstance, config?: Partial<AppConfig>): Promise<void>
```

It fetches `GET /_app/layout` from the backend, which populates the sidebar and the application title.

## AppConfig fields

| Field | Type | Default | Description |
|---|---|---|---|
| `VERSION` | `string` | `'unknown'` | App version shown in the UI |
| `title` | `string` | `'Crouton'` | Frontend override. When omitted, the title served by the backend via `/_app/layout` is used. |
| `renderers` | `JsonFormsRendererRegistryEntry[]` | `[]` | Extra control renderers merged on top of the built-ins in form/edit modals. |
| `readonlyRenderers` | `JsonFormsRendererRegistryEntry[]` | `[]` | Extra renderers merged on top of the built-ins in view (readonly) modals. |
| `cellRenderers` | `CellRendererEntry[]` | `[]` | Extra cell renderers merged on top of the built-ins in tables. |

### Title precedence

1. Explicit `title` in the `init()` config — highest priority (frontend override).
2. `title` returned by `GET /_app/layout` from the backend — set via `CroutonConfig.title` in `CroutonApiModule`.
3. Default `'Crouton'` fallback.

In most cases you should set the title in the backend config and leave it out of `init()`.

## Custom renderers

Pass consumer-specific JSON Forms renderers through `init()`. Crouton merges them _after_ its own built-ins, so a higher tester rank will win:

```ts
import { rankWith, and } from '@jsonforms/core';
import { optionIsIgnoreCase } from '@ghentcdh/crouton-forms-vue';
import { markRaw } from 'vue';
import MyCustomRenderer from './MyCustomRenderer.vue';
import MyCustomCell from './MyCustomCell.vue';

useCrouton().init(useApi(), {
  VERSION: env.VERSION,
  renderers: [
    {
      tester: rankWith(20, and(optionIsIgnoreCase('format', 'my-format'))),
      renderer: markRaw(MyCustomRenderer),
    },
  ],
  cellRenderers: [
    { tester: cellTypeIs('MyCell', 20), renderer: markRaw(MyCustomCell) },
  ],
})
```

The three renderer arrays map to these modal contexts:

- `renderers` — create and edit form modals
- `readonlyRenderers` — view (readonly) modals
- `cellRenderers` — table cell rendering

## Reactive state

```ts
const crouton = useCrouton();

crouton.title    // ComputedRef<string>
crouton.version  // ComputedRef<string>
crouton.sidebar  // SidebarNode[] (reactive getter)
```
