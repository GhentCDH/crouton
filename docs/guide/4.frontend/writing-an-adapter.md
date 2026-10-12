# Writing a framework adapter

To use Crouton with a framework other than Vue, implement the four ports and wrap the controllers with your framework's reactivity.

## 1. Implement the ports

Pass these to `createCroutonClient()` from `@ghentcdh/crouton-frontend-core`:

```ts
import { createCroutonClient } from '@ghentcdh/crouton-frontend-core';

const client = createCroutonClient({
  http,        // HttpClient   — get/post/put/patch/delete
  notifier,    // Notifier     — success/error/info/warning
  storage,     // KeyValueStorage — getItem/setItem (language persistence)
  linkOpener,  // LinkOpener   — open(href, blank?)
});
```

### HttpClient

```ts
type HttpClient = {
  get<T>(url: string, params?: Record<string, unknown>): Promise<T>
  post<T>(url: string, data?: unknown): Promise<T>
  put<T>(url: string, data?: unknown): Promise<T>
  patch<T>(url: string, data?: unknown): Promise<T>
  delete<T>(url: string): Promise<T>
}
```

Any HTTP library works — wrap it to match this shape.

### Notifier

```ts
type Notifier = {
  success(message: string): void
  error(message: string): void
  info(message: string): void
  warning(message: string): void
}
```

### KeyValueStorage

```ts
type KeyValueStorage = { getItem(key: string): string | null; setItem(key: string, value: string): void }
```

Default export `localStorageAdapter` uses `localStorage` with a `typeof` guard.

### LinkOpener

```ts
type LinkOpener = { open(href: string, blank?: boolean): void }
```

Default export `windowLinkOpener` uses `window.open` / `window.location.href`.

## 2. Wrap the controllers

Each controller is a plain factory that returns state stores + methods. Subscribe with your framework's reactive primitives.

| Factory | Store keys | Use for |
|---|---|---|
| `createResourceController` | `params`, `loading`, `data`, `total` | List/sort/page/filter state |
| `createAutoSaver` | `status` (idle/saving/saved/error) | Debounced form auto-save |
| `createLanguageStore` | `language` | Language state + persistence |
| `createStatusPoller` | `status` | Polling backend health |
| `createFormDefCache` | — (returns `get(id)`) | FormDef fetch + cache |

A store has `{ get, set, update, subscribe }`. Subscribe and sync to your reactive state in setup/mount; unsubscribe on destroy.

**Example (framework-agnostic):**

```ts
const ctrl = createResourceController({ http: client.http, notifier: client.notifier });

// subscribe to reactive updates in your framework
const unsub = ctrl.params.subscribe(params => renderTable(params));
onDestroy(unsub);
```

## 3. What stays per-framework

These are NOT in `crouton-frontend-core` — implement them yourself:

- Components and templates
- Routing (`vue-router`, React Router, …)
- Form renderers (JSON Forms Vue/React/Angular, or custom)
- Modal / dialog services
- `provide`/`inject` or React Context wiring
- Vee-validate or other form validation libraries
