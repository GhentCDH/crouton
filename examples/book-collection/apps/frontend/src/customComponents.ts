import { markRaw } from 'vue';

import {
  type CustomComponentEntry,
  customComponentIs,
} from '@ghentcdh/crouton-vue';

import RatingInput from './RatingInput.vue';
import CreateByIsbn from './components/createByIsbn.vue';

export const customComponents: CustomComponentEntry[] = [
  {
    tester: customComponentIs('rating', 10),
    renderer: markRaw(RatingInput),
  },
  {
    tester: customComponentIs('CreateByIsbn', 10),
    renderer: markRaw(CreateByIsbn),
  },
];
