import { rankWith, uiTypeIs } from '../../../../testers/jsonforms-testers';
import ControlReadonlyRenderer from './ControlReadonlyRenderer.vue';

export const readonlyControlRenderers = [
  {
    tester: rankWith(10, uiTypeIs('Control')),
    renderer: ControlReadonlyRenderer,
  },
];
