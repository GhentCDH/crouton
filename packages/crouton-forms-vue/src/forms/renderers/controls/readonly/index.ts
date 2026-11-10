import type { RankedTester } from '@jsonforms/core';
import type { Component } from 'vue';

import { rankWith, uiTypeIs } from '../../../../testers/jsonforms-testers';
import ControlReadonlyRenderer from './ControlReadonlyRenderer.vue';

export const readonlyControlRenderers: Array<{ tester: RankedTester; renderer: Component }> = [
  {
    tester: rankWith(10, uiTypeIs('Control')),
    renderer: ControlReadonlyRenderer as Component,
  },
];
