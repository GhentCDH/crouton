import { type PropType } from 'vue';

export const CanvasShellProperties = {
  lastRemoved: {
    type: Object as PropType<{ id: string; label: string } | null>,
    default: null,
  },
  hiddenFields: {
    type: Array as PropType<{ id: string; label: string }[]>,
    required: true as const,
  },
  excludedCount: { type: Number, default: 0 },
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
};