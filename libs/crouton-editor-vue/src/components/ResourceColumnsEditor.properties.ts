import { type PropType } from 'vue';

import type { Layout } from '@ghentcdh/crouton-core';

import type {
  EditableColumn,
  Tab,
  VariantDraft,
} from '../types/resource-schema-editor.types';

export const ResourceColumnsEditorProperties = {
  columns: {
    type: Array as PropType<EditableColumn[]>,
    required: true as const,
  },
  drafts: {
    type: Object as PropType<Record<string, Record<Tab, VariantDraft>>>,
    required: true as const,
  },
  layout: {
    type: Object as PropType<Layout>,
    required: false as const,
    default: undefined,
  },
};
