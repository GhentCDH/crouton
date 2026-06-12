import { markRaw } from 'vue';

import { type CellRendererEntry, cellTypeIs } from '@ghentcdh/json-forms-vue';

import RelationCell from '../../relation/RelationCell.vue';

export const customCellRenderers: CellRendererEntry[] = [
  // 'RecordCell' is the legacy wire name emitted by older crouton-api versions;
  // 'RelationCell' is the unified name. Both are accepted for compatibility.
  { tester: cellTypeIs('RecordCell', 20), renderer: markRaw(RelationCell) },
  { tester: cellTypeIs('RelationCell', 20), renderer: markRaw(RelationCell) },
];
