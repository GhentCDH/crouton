import { markRaw } from 'vue';

import { type CustomComponentEntry, customComponentIs } from '@ghentcdh/crouton-vue';

import RatingInput from './RatingInput.vue';

export const customComponents: CustomComponentEntry[] = [
  {
    tester: customComponentIs('rating', 10),
    renderer: markRaw(RatingInput),
  },
];
