import type { Component } from 'vue';
import type { RankedTester } from '@jsonforms/core';

import ArrayRenderer from './ArrayRenderer.vue';
import { rankWith } from '../../../testers/jsonforms-testers';
import { isArrayRenderer } from '../../../testers/tester';

type RendererEntry = { tester: RankedTester; renderer: Component };

export const arrayRenderers: RendererEntry[] = [
  { tester: rankWith(12, isArrayRenderer), renderer: ArrayRenderer as Component },
];
