export const CROUTON_PREFIX = 'crouton';
export const CROUTON_FORM = `${CROUTON_PREFIX}/form`;

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
        path: 'formg',
        component: () => import('./admin/RedirectView.vue'),
      },
      {
        path: 'form/:formId',
        name: CROUTON_FORM,
        component: () => import('./resource/ResourceView.vue'),
      },
    ],
  },
];
