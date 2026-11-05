# useCrouton

The `useCrouton` composable is the entry point for wiring up the crouton admin panel. It configures the API, loads the application layout from the backend, and holds global state (sidebar, title, version) and any consumer-registered renderers.

```ts
import { useCrouton } from '@ghentcdh/crouton-vue';
```

## Initialisation

Register `CroutonPlugin` as a Vue plugin at application startup:

```ts
import { createApp } from 'vue';
import { CroutonPlugin } from '@ghentcdh/crouton-vue';

const app = createApp(App);

app.use(
  CroutonPlugin(useApi(), {
    VERSION,
    customComponents: customComponents,
  }),
);
```

`CroutonPlugin` signature:

```ts
CroutonPlugin(api: AxiosInstance, options?: Partial<AppConfig>): Plugin
```

It configures the API, sets up renderer injection via `app.provide`, and fetches `GET /_app/layout` from the backend to populate the sidebar and application title.

## AppConfig fields

| Field | Type | Default | Description |
|---|---|---|---|
| `VERSION` | `string` | `'unknown'` | App version shown in the UI |
| `title` | `string` | `'Crouton'` | Frontend override. When omitted, the title served by the backend via `/_app/layout` is used. |
| `renderers` | `JsonFormsRendererRegistryEntry[]` | `[]` | Extra control renderers merged on top of the built-ins in form/edit modals. |
| `readonlyRenderers` | `JsonFormsRendererRegistryEntry[]` | `[]` | Extra renderers merged on top of the built-ins in view (readonly) modals. |
| `cellRenderers` | `CellRendererEntry[]` | `[]` | Extra cell renderers merged on top of the built-ins in tables. |
| `customComponents` | `CustomComponentEntry[]` | `[]` | Custom Vue components for page-level display and custom format fields. |

### Title precedence

1. Explicit `title` in `CroutonPlugin` options — highest priority (frontend override).
2. `title` returned by `GET /_app/layout` from the backend — set via `CroutonConfig.title` in `CroutonApiModule`.
3. Default `'Crouton'` fallback.

In most cases you should set the title in the backend config and leave it out of the plugin options.

## Custom component fields

Add `customComponent` to any `fieldInput.options` to override the default renderer for that field with a custom Vue
component. Works with any format (`relation`, `date-range`, etc.):

```json
{
  "fieldInput": {
    "format": "relation",
    "resource": "../section/resource.json",
    "options": { "customComponent": "work-sections" }
  }
}
```

```ts
import { CroutonPlugin, customComponentIs } from '@ghentcdh/crouton-vue';
import { markRaw } from 'vue';
import WorkSectionsEditor from './components/WorkSectionsEditor.vue';

app.use(
  CroutonPlugin(useApi(), {
    VERSION,
    customComponents: [
      { tester: customComponentIs('work-sections', 1), renderer: markRaw(WorkSectionsEditor) },
    ],
  }),
);
```

The same `customComponents` registry is used for page-level custom components (`display.customComponent`), field-level
custom component overrides, and table cell custom components (`tableView.options.customComponent`).

## Custom renderers

Pass consumer-specific JSON Forms renderers through `CroutonPlugin`. Crouton merges them _after_ its own built-ins, so a higher tester rank will win:

```ts
import { rankWith, isCustomFormat, CroutonPlugin } from '@ghentcdh/crouton-vue';
import { markRaw } from 'vue';
import MyCustomRenderer from './MyCustomRenderer.vue';
import MyCustomCell from './MyCustomCell.vue';

const app = createApp(App);

app.use(
  CroutonPlugin(useApi(), {
    VERSION,
    renderers: [
      {
        tester: rankWith(20, isCustomFormat('my-format')),
        renderer: markRaw(MyCustomRenderer),
      },
    ],
    cellRenderers: [
      { tester: cellTypeIs('MyCell', 20), renderer: markRaw(MyCustomCell) },
    ],
  }),
);
```

The three renderer arrays map to these modal contexts:

- `renderers` — create/edit modals **and** view (readonly) modals. Use for custom formats that should work in all contexts.
- `readonlyRenderers` — view (readonly) modals only, stacked on top of `renderers`. Use when you need a different display component specifically for readonly mode.
- `cellRenderers` — table cell rendering

## Reactive state

```ts
const crouton = useCrouton();

crouton.title    // ComputedRef<string>
crouton.version  // ComputedRef<string>
crouton.sidebar  // SidebarNode[] (reactive getter)
```
