import { type PropType } from 'vue';

import type { CanvasSelectOption } from './FieldPreview.properties';
import type { CanvasField } from './canvas-layout';
import type { CanvasTypeOption } from './type-swaps';

export type { CanvasSelectOption };

export const FormFieldCardProperties = {
  field: { type: Object as PropType<CanvasField>, required: true as const },
  /** Same-shape swap targets for this field's current type — empty means no "change type" menu entry. */
  typeOptions: {
    type: Array as PropType<CanvasTypeOption[]>,
    required: true as const,
  },
  /** Options for select/multiSelect preview rendering — irrelevant for other types. */
  selectOptions: {
    type: Array as PropType<CanvasSelectOption[]>,
    default: () => [],
  },
  /** Label for the remove action in the field menu. */
  removeLabel: { type: String, default: 'Remove from form' },
  /** Whether this card is currently selected for detail editing. */
  selected: { type: Boolean, default: false },
};