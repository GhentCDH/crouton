import { type PropType } from 'vue';

import type { CanvasField } from './canvas-layout';
import type { CanvasSelectOption } from './FieldPreview.properties';
import type { CanvasTypeOption } from './type-swaps';

export type { CanvasSelectOption };

export const FormFieldCardProperties = {
  field: { type: Object as PropType<CanvasField>, required: true as const },
  /** Same-shape swap targets for this field's current type — empty means no "change type" menu entry. */
  typeOptions: {
    type: Array as PropType<CanvasTypeOption[]>,
    required: true as const,
  },
  /** Options for select/mutliSelect preview rendering — irrelevant for other types. */
  selectOptions: {
    type: Array as PropType<CanvasSelectOption[]>,
    default: () => [],
  },
  /** The grid container element, so the resize handle can measure drag distance against actual column width. */
  gridEl: { type: Object as PropType<HTMLElement | null>, default: null },
};