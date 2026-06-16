import ControlReadonlyRenderer from './ControlReadonlyRenderer.vue';
import { rankWith, uiTypeIs } from '../../../../testers/jsonforms-testers';

export const readonlyControlRenderers = [
  {
    tester: rankWith(10, uiTypeIs('Control')),
    renderer: ControlReadonlyRenderer,
  },
];
