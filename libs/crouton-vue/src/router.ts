import type { RouteLocationNormalized, RouteRecordRaw } from 'vue-router';

export const CROUTON_PREFIX = 'crouton';
export const CROUTON_FORM = `${CROUTON_PREFIX}/form`;
export const CROUTON_DEV_RESOURCES = `${CROUTON_PREFIX}/dev-resources`;
export const CROUTON_STATUS = `${CROUTON_PREFIX}/status`;

const statusRoute = {
  path: 'crouton-status',
  name: CROUTON_STATUS,
  component: () => import('./status/StatusView.vue'),
};

export const CroutonRouter: RouteRecordRaw[] = [
  {
    path: '',
    component: () => import('./admin/AdminView.vue'),
    children: [
      {
        path: '',
        component: () => import('./admin/RedirectView.vue'),
      },
      {
        path: 'crouton',
        component: () => import('./admin/RedirectView.vue'),
      },
      {
        path: 'crouton/:formId',
        name: CROUTON_FORM,
        component: () => import('./resource/ResourceView.vue'),
        // Lazy import avoids a load-order cycle (useCrouton → sidebar → CROUTON_FORM → here).
        // Empty sidebar means layout not yet fetched — let through so initial load is not blocked.
        beforeEnter: async (to: RouteLocationNormalized) => {
          const { useCrouton } = await import('./composables/useCrouton');
          const app = useCrouton();
          if (!app.sidebar.length) return true;
          const formId = to.params['formId'] as string;
          if (app.isInSidebar(formId)) return true;
          const first = app.firstSidebarId;
          return first ? { name: CROUTON_FORM, params: { formId: first } } : false;
        },
      },
      {
        path: 'crouton-dev-resources',
        name: CROUTON_DEV_RESOURCES,
        component: () => import('./dev-tools/DevResourcesPanel.vue'),
        /**
         * Dev-only route: the visual resource builder's database sync tools.
         * `CroutonRouter` is a static array built at module-load time, before
         * `/_app/layout` has ever been fetched, so the route itself can't be
         * conditionally omitted — instead this guard blocks navigation into
         * it (cancels, staying put) whenever the connected backend hasn't
         * confirmed `isDev` (`CROUTON_SCHEMA_EDITOR` env var). The sidebar
         * link in `AdminView.vue` is hidden the same way, so in practice
         * this only ever fires if someone navigates here directly.
         *
         * Imports `useCrouton` lazily (rather than at module top level) to
         * avoid a load-order cycle: `useCrouton` pulls in `./composables/sidebar`,
         * which itself imports `CROUTON_FORM` from this file.
         */
        beforeEnter: async (): Promise<boolean> => {
          const { useCrouton } = await import('./composables/useCrouton');
          return useCrouton().isDev.value;
        },
      },
      {
        path: '/:pathMatch(.*)*',
        redirect: '/',
      },
    ],
  },
  statusRoute,
  {
    path: 'status',
    redirect: { name: CROUTON_STATUS },
  },
];
