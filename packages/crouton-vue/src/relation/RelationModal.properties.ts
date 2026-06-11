import type { ExtractPublicPropTypes, PropType } from 'vue';

export const RelationModalProperties = {
  /** Title displayed in the modal header. */
  modalTitle: { type: String, required: true as const },
  /** Label for the close button. */
  closeLabel: { type: String, default: 'Close' },
  column: { type: Object, required: true as const },
  options: { type: Object, required: true as const },
  /** Callback invoked when the modal closes (with result or `null` on cancel). */
  onClose: {
    type: Function as PropType<() => void>,
    default: () => {
      //the default one
    },
  },
  /**
   * Show the Edit button.
   * The caller wires the action by listening to the `edit` event via `onEdit`
   * in the props object — Vue's v-bind spread in modalWrapper converts onXxx
   * keys into event handlers automatically.
   */
  canEdit: { type: Boolean, default: false },
  /**
   * Show the Delete button.
   * The caller wires the action by listening to the `delete` event via `onDelete`
   * in the props object.
   */
  canDelete: { type: Boolean, default: false },
  /** Initial form data to populate the form with. */
  data: { type: Object as PropType<any>, required: true as const },
};

export type RelationModalProp = ExtractPublicPropTypes<
  typeof RelationModalProperties
>;

export const RelationModalEmits = [
  /** Emitted when the modal is closed. */
  'closeModal',
];
