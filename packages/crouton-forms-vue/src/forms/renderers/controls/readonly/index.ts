import { rankWith, uiTypeIs } from '@ghentcdh/crouton-frontend-core';

import ControlReadonlyRenderer from './ControlReadonlyRenderer.vue';

export const readonlyControlRenderers = [
  {
    tester: rankWith(10, uiTypeIs('Control')),
    renderer: ControlReadonlyRenderer,
  },
];
