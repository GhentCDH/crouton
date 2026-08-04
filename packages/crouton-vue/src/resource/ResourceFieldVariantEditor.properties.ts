import { type PropType } from 'vue';

import type {
  EditableColumn,
  Tab,
  VariantDraft,
} from './resource-schema-editor.types';

export const ResourceFieldVariantEditorProperties = {
  col: { type: Object as PropType<EditableColumn>, required: true as const },
  /** This column's per-tab drafts — a slice of the parent's reactive `drafts` map, mutated in place. */
  drafts: {
    type: Object as PropType<Record<Tab, VariantDraft>>,
    required: true as const,
  },
  activeTab: { type: String as PropType<Tab>, required: true as const },
};
