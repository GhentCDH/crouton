import { and, rankWith } from '@jsonforms/core';
import { markRaw } from 'vue';

import { optionIsIgnoreCase } from '@ghentcdh/json-forms-vue';

import RelationControlRenderer from '../relation/RelationControlRenderer.vue';
import RelationReadonlyRenderer from '../relation/RelationReadonlyRenderer.vue';

export const isRelationControl = and(optionIsIgnoreCase('format', 'relation'));

/**
 * Additional renderers to pass as the `renderers` prop.
 * These are merged ON TOP of the base renderers inside FormComponent —
 * no need to include customRenderes or relationReadonlyRenderers here.
 */
export const relationRenderers = [
  {
    tester: rankWith(16, isRelationControl),
    renderer: markRaw(RelationControlRenderer),
  },
];

export const relationReadonlyRenderers = [
  {
    tester: rankWith(16, isRelationControl),
    renderer: markRaw(RelationReadonlyRenderer),
  },
];
