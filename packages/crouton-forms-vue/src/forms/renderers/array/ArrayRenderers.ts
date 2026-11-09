import type { Component } from 'vue';

import ArrayRenderer from './ArrayRenderer.vue';
import { rankWith } from '../../../testers/jsonforms-testers';
import { isArrayRenderer } from '../../../testers/tester';

export const arrayRenderers: Array<{ tester: (el: unknown, schema: unknown) => number; renderer: Component }> = [
  { tester: rankWith(12, isArrayRenderer), renderer: ArrayRenderer as Component },
];
