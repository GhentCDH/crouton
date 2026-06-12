import { and, rankWith } from '@jsonforms/core';
import { markRaw } from 'vue';

import { type CellRendererEntry, cellTypeIs, optionIsIgnoreCase } from '@ghentcdh/json-forms-vue';

import RelationControlRenderer from '../relation/RelationControlRenderer.vue';
import RelationReadonlyRenderer from '../relation/RelationReadonlyRenderer.vue';
import RelationCell from '../relation/RelationCell.vue';

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

export const customCellRenderers: CellRendererEntry[] = [
  // 'RecordCell' is the legacy wire name emitted by older crouton-api versions;
  // 'RelationCell' is the unified name. Both are accepted for compatibility.
  { tester: cellTypeIs('RecordCell', 20), renderer: markRaw(RelationCell) },
  { tester: cellTypeIs('RelationCell', 20), renderer: markRaw(RelationCell) },
];
