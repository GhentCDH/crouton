import CollapseLayoutRenderer from './CollapseLayoutRenderer.vue';
import GroupLayoutRenderer from './GroupLayoutRenderer.vue';
import LayoutRenderer from './LayoutRenderer.vue';
import ReadOnlyLayoutRenderer from './ReadOnlyLayoutRenderer.vue';
import { or, rankWith, uiTypeIs } from '../../../testers/jsonforms-testers';

const isLayoutType = or(
  uiTypeIs('GridLayout'),
  uiTypeIs('HorizontalLayout'),
  uiTypeIs('VerticalLayout'),
);

export const layoutRenderers = [
  { tester: rankWith(10, isLayoutType), renderer: LayoutRenderer },
  {
    tester: rankWith(10, uiTypeIs('CollapseLayout')),
    renderer: CollapseLayoutRenderer,
  },
  {
    tester: rankWith(10, uiTypeIs('GroupLayout')),
    renderer: GroupLayoutRenderer,
  },
];

export const readonlyLayoutRenderers = [
  { tester: rankWith(10, isLayoutType), renderer: ReadOnlyLayoutRenderer },
  {
    tester: rankWith(10, uiTypeIs('CollapseLayout')),
    renderer: CollapseLayoutRenderer,
  },
  {
    tester: rankWith(10, uiTypeIs('GroupLayout')),
    renderer: GroupLayoutRenderer,
  },
];
