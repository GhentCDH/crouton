import { isArrayRenderer, rankWith  } from '@ghentcdh/crouton-frontend-core';

import ArrayRenderer from './ArrayRenderer.vue';


export const arrayRenderers = [
  { tester: rankWith(12, isArrayRenderer), renderer: ArrayRenderer },
];
