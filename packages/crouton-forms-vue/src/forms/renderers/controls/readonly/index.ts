import type { Component } from 'vue';

import ControlReadonlyRenderer from './ControlReadonlyRenderer.vue';
import { rankWith, uiTypeIs } from '../../../../testers/jsonforms-testers';

export const readonlyControlRenderers: Array<{ tester: (el: unknown, schema: unknown) => number; renderer: Component }> = [
  {
    tester: rankWith(10, uiTypeIs('Control')),
    renderer: ControlReadonlyRenderer as Component,
  },
];
