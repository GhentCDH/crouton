export const CROUTON_PREFIX = 'crouton';
export const CROUTON_FORM = `${CROUTON_PREFIX}/form`;
export const CROUTON_DEV_RESOURCES = `${CROUTON_PREFIX}/dev-resources`;

export const CroutonRouter = [
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
  {
    path: 'status',
    component: () => import('./status/StatusView.vue'),
  },
];
