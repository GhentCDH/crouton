import { type PropType } from 'vue';

import type {
  EditableColumn,
  Tab,
  VariantDraft,
} from '../types/resource-schema-editor.types';

export const CanvasDetailPanelProperties = {
  col: { type: Object as PropType<EditableColumn>, required: true as const },
  drafts: {
    type: Object as PropType<Record<Tab, VariantDraft>>,
    required: true as const,
  },
  context: { type: String as PropType<Tab>, required: true as const },
};
