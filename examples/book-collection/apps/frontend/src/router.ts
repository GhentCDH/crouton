import { createRouter, createWebHistory } from 'vue-router';

import { CroutonRouter } from '@ghentcdh/crouton-vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      // Isolated control playground used by e2e tests (tests/controls/).
      path: '/controls/:control',
      component: () => import('./controls/ControlPage.vue'),
    },
    {
      path: '/',
      name: 'admin',
      children: [...CroutonRouter],
    },
  ],
});
