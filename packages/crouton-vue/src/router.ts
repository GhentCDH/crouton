export const CROUTON_PREFIX = 'crouton';
export const CROUTON_FORM = `${CROUTON_PREFIX}/form`;

export const CroutonRouter = [
  {
    path: 'form/:formId',
    component: () => import('./admin/AdminView.vue'),
    children: [
      {
        path: '',
        name: CROUTON_FORM,
        component: () => import('./resource/ResourceView.vue'),
      },
    ],
  },
];
