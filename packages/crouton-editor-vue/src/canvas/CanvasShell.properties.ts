import { type PropType } from 'vue';

import type {
  EditableColumn,
  Tab,
  VariantDraft,
} from '../types/resource-schema-editor.types';

export const CanvasShellProperties = {
  lastRemoved: {
    type: Object as PropType<{ id: string; label: string } | null>,
    default: null,
  },
  hiddenFields: {
    type: Array as PropType<{ id: string; label: string }[]>,
    required: true as const,
  },
  hasFields: { type: Boolean, required: true as const },
  warningText: {
    type: String,
    default:
      'Visual mode is still in development — drag, resize, change-type, and add/remove are new and less battle-tested than the Table view. Switch back to Table if something looks wrong.',
  },
  emptyText: {
    type: String,
    default:
      'No standard fields to lay out yet — add one below, or edit relation fields in the Table view.',
  },
  /** All columns — used to look up the selected column for the detail panel. */
  columns: {
    type: Array as PropType<EditableColumn[]>,
    default: () => [],
  },
  /** Per-column drafts map — passed through to the detail panel. */
  drafts: {
    type: Object as PropType<Record<string, Record<Tab, VariantDraft>>>,
    default: () => ({}),
  },
  /** Which canvas context is active (form/view/table). */
  context: {
    type: String as PropType<Tab>,
    default: 'form' as const,
  },
  /** ID of the currently selected field, or null if none. */
  selectedFieldId: {
    type: String as PropType<string | null>,
    default: null,
  },
};