# Frontend setup

Add the crouton admin UI to a Vue 3 application.

## Install

```sh
pnpm add @ghentcdh/crouton-vue
```

Peer dependencies (`vue`, `vue-router`, `axios`, `@ghentcdh/ui`, …) are installed automatically by pnpm and npm.

## Styles

Import the crouton styles once, in your application entry:

```ts
// main.ts
import '@ghentcdh/crouton-vue/styles.css';
```

## Bootstrap

Initialize crouton with an axios instance **before** mounting the app. `init()` configures the API client and fetches `/_app/layout` from the backend to build the sidebar:

```ts
// main.ts
import { createApp } from 'vue';
import axios from 'axios';
import { useCrouton } from '@ghentcdh/crouton-vue';

import App from './app/App.vue';
import router from './router';

const api = axios.create({ baseURL: 'http://localhost:3000' });

useCrouton()
  .init(api, { title: 'My App' })
  .then(() => {
    const app = createApp(App);
    app.use(router);
    app.mount('#root');
  });
```

::: tip
Any pre-configured `AxiosInstance` works — add your auth interceptors to it before passing it to `init()`.
:::

## Mount the routes

Spread `CroutonRouter` under the path where the admin UI should live:

```ts
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { CroutonRouter } from '@ghentcdh/crouton-vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    {
      path: '/admin',
      name: 'admin',
      children: [...CroutonRouter],
    },
  ],
});

export default router;
```

Navigating to `/admin/form/<resource>` now renders the complete admin view — table, filters, and forms — for that resource. Nothing else to configure.

Navigate programmatically with the named route:

```ts
import { CROUTON_FORM } from '@ghentcdh/crouton-vue';

router.push({ name: CROUTON_FORM, params: { formId: 'book' } });
```

## Sidebar

`useCrouton()` exposes the sidebar built from `/_app/layout`:

```ts
const { sidebar } = useCrouton();
```

Use it to render your own navigation, or hide resources from it via `sidebar.hide` in their [resource.json](./resource-json.md).

## Advanced: schemas in custom views

For custom pages that want the resource schemas directly, use the cached form definitions:

```ts
const { getFormDef } = useCrouton();

const formDef = await getFormDef('book'); // GET /book/schemas (cached)
// formDef.schemas.table / .form / .view / .filter
```
