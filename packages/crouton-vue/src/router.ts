export const CROUTON_PREFIX = 'crouton';
export const CROUTON_FORM = `${CROUTON_PREFIX}/form`;

export const CroutonRouter = [
  {
    path: 'form/:formId',
    component: () => import('./AdminView.vue'),
    children: [
      {
        path: '',
        name: CROUTON_FORM,
        component: () => import('./form/form.vue'),
      },
    ],
  },
];
