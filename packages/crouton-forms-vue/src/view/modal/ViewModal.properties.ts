import type { ExtractPublicPropTypes, PropType } from 'vue';

import type { SizeType } from '@ghentcdh/crouton-core';

export const ViewModalProperties = {
  /** Title displayed in the modal header. */
  modalTitle: { type: String, required: true as const },
  /** Label for the close button. */
  closeLabel: { type: String, default: 'Close' },
  /** Label for the edit button. Only rendered when `canEdit` is true. */
  editLabel: { type: String, default: 'Edit' },
  /** Label for the delete button. Only rendered when `canDelete` is true. */
  deleteLabel: { type: String, default: 'Delete' },
  /** JSON schema describing the shape of the form data. */
  schema: { type: Object as PropType<any>, required: true as const },
  /** UI schema describing the layout and controls. */
  uiSchema: { type: Object as PropType<any>, required: true as const },
  /** Modal width (`'xs'`, `'sm'`, `'md'`, `'lg'`, `'xl'`). */
  modalSize: { type: String as PropType<SizeType>, default: 'md' },
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
  /** Custom renderer registry passed to the inner JsonForm. */
  renderers: {
    type: Array as PropType<any[]>,
    default: null,
  },
};

export type ViewModalProp = ExtractPublicPropTypes<typeof ViewModalProperties>;

export const ViewModalEmits = [
  /** Emitted when the modal is closed. */
  'closeModal',
  /** Emitted when the Edit button is clicked. Payload: current form data. */
  'edit',
  /** Emitted when the Delete button is clicked. Payload: current form data. */
  'delete',
  /** Emitted when the view event is fired from the form. Payload: payload of the form event */
  'view',
];

/** Result payload returned when the modal is submitted. */
export type ViewModalResult<DATA = any> = {
  /** The form data at the time of submission. */
  data: DATA;
  /** Whether the form passed validation. */
  valid: boolean;
};
