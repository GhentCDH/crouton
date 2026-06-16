import CollapseLayoutRenderer from './CollapseLayoutRenderer.vue';
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
];

export const readonlyLayoutRenderers = [
  { tester: rankWith(10, isLayoutType), renderer: ReadOnlyLayoutRenderer },
  {
    tester: rankWith(10, uiTypeIs('CollapseLayout')),
    renderer: CollapseLayoutRenderer,
  },
];
