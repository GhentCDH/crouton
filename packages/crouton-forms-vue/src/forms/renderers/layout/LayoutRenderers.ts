import type { Component } from 'vue';
import type { RankedTester } from '@jsonforms/core';

import CollapseLayoutRenderer from './CollapseLayoutRenderer.vue';
import GroupLayoutRenderer from './GroupLayoutRenderer.vue';
import LayoutRenderer from './LayoutRenderer.vue';
import ReadOnlyLayoutRenderer from './ReadOnlyLayoutRenderer.vue';
import { or, rankWith, uiTypeIs } from '../../../testers/jsonforms-testers';

type RendererEntry = { tester: RankedTester; renderer: Component };

const isLayoutType = or(
  uiTypeIs('GridLayout'),
  uiTypeIs('HorizontalLayout'),
  uiTypeIs('VerticalLayout'),
);

export const layoutRenderers: RendererEntry[] = [
  { tester: rankWith(10, isLayoutType), renderer: LayoutRenderer as Component },
  {
    tester: rankWith(10, uiTypeIs('CollapseLayout')),
    renderer: CollapseLayoutRenderer as Component,
  },
  {
    tester: rankWith(10, uiTypeIs('GroupLayout')),
    renderer: GroupLayoutRenderer as Component,
  },
];

export const readonlyLayoutRenderers: RendererEntry[] = [
  { tester: rankWith(10, isLayoutType), renderer: ReadOnlyLayoutRenderer as Component },
  {
    tester: rankWith(10, uiTypeIs('CollapseLayout')),
    renderer: CollapseLayoutRenderer as Component,
  },
  {
    tester: rankWith(10, uiTypeIs('GroupLayout')),
    renderer: GroupLayoutRenderer as Component,
  },
];
