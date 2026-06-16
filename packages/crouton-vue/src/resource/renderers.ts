import { and, rankWith } from '@jsonforms/core';
import { markRaw } from 'vue';

import { type CellRendererEntry, cellTypeIs, optionIsIgnoreCase } from '@ghentcdh/json-forms-vue';

import DateRangeControlRenderer from '../range/DateRangeControlRenderer.vue';
import RelationCell from '../relation/RelationCell.vue';
import RelationControlRenderer from '../relation/RelationControlRenderer.vue';
import RelationReadonlyRenderer from '../relation/RelationReadonlyRenderer.vue';

export const isRelationControl = and(optionIsIgnoreCase('format', 'relation'));

export const isDateRangeControl = and(optionIsIgnoreCase('format', 'date-range'));

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

/**
 * All custom control renderers to pass as the `renderers` prop.
 * Merged ON TOP of the base renderers inside the form modal.
 */
export const customControlRenderers = [
  ...relationRenderers,
  {
    tester: rankWith(16, isDateRangeControl),
    renderer: markRaw(DateRangeControlRenderer),
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
