# Architecture

Crouton is split into three layers so framework adapters (Vue, React, Svelte, web components) can share all business logic and only implement rendering.

## Layers

```
┌─────────────────────────────────────────────────────┐
│  crouton-vue / crouton-forms-vue / crouton-editor-vue│
│  Vue adapters: components, composables, renderers,   │
│  provide/inject, router, vee-validate, modals        │
├─────────────────────────────────────────────────────┤
│  crouton-frontend-core                               │
│  Framework-agnostic browser runtime:                 │
│  API client, FormDef cache, controllers, stores      │
│  Platform: browser only                              │
├─────────────────────────────────────────────────────┤
│  crouton-core                                        │
│  Definitions: types, Zod schemas, JSON Forms types   │
│  Platform: browser + Node (shared with backend/CLI)  │
└─────────────────────────────────────────────────────┘
```

## Package boundaries

| Package | May import | Must NOT import |
|---|---|---|
| `crouton-core` | `zod`, `@jsonforms/core` | anything browser/Node-only |
| `crouton-frontend-core` | `crouton-core`, `zod`, `@jsonforms/core` | `vue`, `vue-router`, `vee-validate`, `@ghentcdh/ui`, `axios`, React |
| Vue packages | anything above + Vue stack | NestJS, Node-only |

## Why the split

`crouton-core` is imported by the backend and CLI. Fetch calls, `localStorage`, `window`, FormDef cache, and client-side state have no place on the server. `crouton-frontend-core` is the boundary: all client runtime lives here, nothing Node-specific leaks in.
