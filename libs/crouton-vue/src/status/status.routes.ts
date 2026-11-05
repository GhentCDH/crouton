import { CROUTON_STATUS } from '../router';

export const CroutonStatusRoutes = [
  {
    path: 'crouton-status',
    name: CROUTON_STATUS,
    component: () => import('./StatusView.vue'),
  },
];
