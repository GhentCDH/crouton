import ArrayRenderer from './ArrayRenderer.vue';
import { rankWith } from '../../../testers/jsonforms-testers';
import { isArrayRenderer } from '../../../testers/tester';


export const arrayRenderers = [
  { tester: rankWith(12, isArrayRenderer), renderer: ArrayRenderer },
];
