import { type PropType } from 'vue';

import type {
  EditableColumn,
  Tab,
  VariantDraft,
} from '../types/resource-schema-editor.types';

export const FormCanvasEditorProperties = {
  /** Same array reference `ResourceColumnsEditor` gets — mutated directly (`hiddenIn*`), same pattern as the rest of this package. */
  columns: {
    type: Array as PropType<EditableColumn[]>,
    required: true as const,
  },
  /** Same drafts map `ResourceColumnsEditor`/`ResourceFieldVariantEditor` get — `drafts[id][ctx].{position,colspan,type}` are mutated directly. */
  drafts: {
    type: Object as PropType<Record<string, Record<Tab, VariantDraft>>>,
    required: true as const,
  },
  /** Which context this canvas edits — 'form' (default) or 'view'. */
  context: {
    type: String as PropType<'form' | 'view'>,
    default: 'form' as const,
  },
};
