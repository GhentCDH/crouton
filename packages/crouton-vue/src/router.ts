export const CROUTON_PREFIX = 'crouton';
export const CROUTON_FORM = `${CROUTON_PREFIX}/form`;
export const CROUTON_DEV_RESOURCES = `${CROUTON_PREFIX}/dev-resources`;
export const CROUTON_STATUS = `${CROUTON_PREFIX}/status`;

const statusRoute = {
  path: 'crouton-status',
  name: CROUTON_STATUS,
  component: () => import('./status/StatusView.vue'),
};

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
        // Guard: reject formIds not listed in the sidebar (hidden/draft resources).
        // Lazy import avoids a load-order cycle (useCrouton → sidebar → CROUTON_FORM → here).
        // If the sidebar is empty (layout not yet fetched), we let the navigation through
        // so the initial page load is not blocked.
        beforeEnter: async (to) => {
          const { useCrouton } = await import('./composables/useCrouton');
          const { isSidebarGroup, firstLeafId } = await import('./composables/sidebar');
          const nodes = useCrouton().sidebar;
          if (!nodes.length) return true;
          const formId = to.params['formId'] as string;
          const inSidebar = nodes.some((n) =>
            isSidebarGroup(n) ? n.children.some((c) => c.id === formId) : n.id === formId,
          );
          if (inSidebar) return true;
          const first = firstLeafId(nodes);
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
