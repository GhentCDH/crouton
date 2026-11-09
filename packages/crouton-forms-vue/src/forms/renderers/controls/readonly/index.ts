import type { Component } from 'vue';

import { rankWith, uiTypeIs } from '../../../../testers/jsonforms-testers';
import ControlReadonlyRenderer from './ControlReadonlyRenderer.vue';

export const readonlyControlRenderers: Array<{ tester: (el: unknown, schema: unknown) => number; renderer: Component }> = [
  {
    tester: rankWith(10, uiTypeIs('Control')),
    renderer: ControlReadonlyRenderer as Component,
  },
];
