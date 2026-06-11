import { markRaw } from 'vue';

import { type CellRendererEntry, cellTypeIs } from '@ghentcdh/json-forms-vue';

import RelationCell from '../../relation/RelationCell.vue';

export const customCellRenderers: CellRendererEntry[] = [
  { tester: cellTypeIs('RecordCell', 20), renderer: markRaw(RelationCell) },
];
