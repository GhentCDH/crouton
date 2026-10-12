import { type PropType } from 'vue';

import type {
  EditableColumn,
  Tab,
  VariantDraft,
} from '@ghentcdh/crouton-frontend-core';

export const TableCanvasEditorProperties = {
  columns: {
    type: Array as PropType<EditableColumn[]>,
    required: true as const,
  },
  drafts: {
    type: Object as PropType<Record<string, Record<Tab, VariantDraft>>>,
    required: true as const,
  },
};