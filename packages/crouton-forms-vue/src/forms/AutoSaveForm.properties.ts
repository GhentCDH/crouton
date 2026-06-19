import type { ExtractPublicPropTypes, PropType } from 'vue';

import type { SizeType } from '@ghentcdh/crouton-core';

import type { FormEventPayload } from '../composables/useFormEvents';
import type { HttpClient } from '../http-client';
import { type ErrorMode } from './errorMode';

export const AutoSaveFormProperties = {
  /** Title displayed in the modal header. */
  modalTitle: { type: String, required: true as const },
  /** Label for the save button. */
  saveLabel: { type: String, default: 'Save' },
  /** Label for the cancel button. */
  cancelLabel: { type: String, default: 'Cancel' },
  /** JSON schema describing the shape of the form data. */
  schema: { type: Object as PropType<any>, required: true as const },
  /** UI schema describing the layout and controls. */
  uiSchema: { type: Object as PropType<any>, required: true as const },
  /** Modal width (`'xs'`, `'sm'`, `'md'`, `'lg'`, `'xl'`). */
  modalSize: { type: String as PropType<SizeType>, default: 'md' },
  /** Callback invoked when the modal closes (with result or `null` on cancel). */
  onClose: {
    type: Function as PropType<(result: any) => void>,
    required: true as const,
  },
  /** Callback for form events dispatched by custom renderers. */
  onEvents: {
    type: Function as PropType<(payload: FormEventPayload) => void>,
  },
  /** Initial form data to populate the form with. */
  data: { type: Object as PropType<any>, required: true as const },
  /** When validation errors are shown. */
  errorMode: {
    type: String as PropType<ErrorMode>,
    default: 'onBlur' as const,
  },
  /** HTTP client passed through to the inner JsonForm for remote renderers (e.g. autocomplete). */
  http: {
    type: Object as PropType<HttpClient>,
    default: null,
  },
  /** Custom renderer registry passed to the inner JsonForm. */
  renderers: {
    type: Array as PropType<any[]>,
    default: null,
  },
  /**
   * When true, form changes are saved automatically (debounced) instead of
   * requiring an explicit Save button click. Save/Cancel are replaced by a
   * Close button with a status indicator. Requires `onAutoSave`.
   */
  autoSave: {
    type: Boolean,
    default: false,
  },
  /**
   * Called with the current form data whenever the debounce fires and the form
   * is valid. Should return a promise. Only used when `autoSave` is true.
   */
  onAutoSave: {
    type: Function as PropType<(data: any) => Promise<any>>,
    default: null,
  },
  /**
   * Called when a relation inside the form is created, updated, or deleted.
   * Should return a promise resolving to the fresh parent record. When
   * provided the form reloads automatically after every relation change,
   * and any pending auto-save debounce is cancelled first to prevent stale
   * data from overwriting the server state.
   * Only meaningful in edit mode (relations require an existing parent id).
   */
  onRefreshData: {
    type: Function as PropType<() => Promise<any>>,
    default: null,
  },
};

export type AutoSaveFormProp = ExtractPublicPropTypes<
  typeof AutoSaveFormProperties
>;

export const AutoSaveFormEmits = [
  /** Emitted when the modal is closed (submit or cancel). */
  'closeModal',
  /** Emitted when a custom renderer dispatches a form event. */
  'events',
  /** Emitted when validation errors change. */
  'errors',
  /** Emitted when form validity changes. */
  'valid',
];

/** Result payload returned when the modal is submitted. */
export type AutoSaveFormResult<DATA = any> = {
  /** The form data at the time of submission. */
  data: DATA;
  /** Whether the form passed validation. */
  valid: boolean;
};
