import type { ExtractPublicPropTypes, PropType } from 'vue';

import { type ViewConfig, type ViewDef } from '@ghentcdh/crouton-core';
import {
  type ErrorMode,
  type FormEventPayload,
  type HttpClient,
} from '@ghentcdh/crouton-forms-vue';

import { type ResourceApiInstance } from '../resource';

type Views = Record<ViewDef, ViewConfig>;

export const CroutonFormProperties = {
  /** Title displayed in the modal header. */
  title: { type: String, required: false as const },
  /** Label for the save button. */
  saveLabel: { type: String, default: 'Save' },
  /** Label for the cancel button. */
  cancelLabel: { type: String, default: 'Cancel' },
  layout: { type: String, default: 'rows' },

  /** Callback for form events dispatched by custom renderers. */
  onEvents: {
    type: Function as PropType<(payload: FormEventPayload) => void>,
    required: false,
  },
  /** Initial form data to populate the form with. */
  data: { type: Object as PropType<any>, required: true as const },
  /** When validation errors are shown. */
  errorMode: {
    type: String as PropType<ErrorMode>,
    default: 'onBlur' as const,
    required: false,
  },
  /** HTTP client passed through to the inner JsonForm for remote renderers (e.g. autocomplete). */
  http: {
    type: [Object, Function] as PropType<HttpClient>,
    default: null,
    required: false,
  },
  /** Custom renderer registry passed to the inner JsonForm. */
  renderers: {
    type: Array as PropType<any[]>,
    default: null,
    required: false,
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
  validateOnMount: {
    type: Boolean,
    default: false,
  },
  showButtons: {
    type: Boolean,
    default: true,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  formMaxWidth: {
    type: String,
    default: 'w-full',
  },
  views: {
    type: Object as PropType<ViewDef>,
    required: true,
  },
  formatBeforeSave: {
    type: Function as PropType<(data: any) => Promise<any>>,
    required: false,
    default: null,
  },
  resourceApi: {
    type: Object as PropType<ResourceApiInstance>,
    required: false,
  },
  saveId: {
    type: String,
    required: false,
    default: null,
  },
  showErrors: {
    type: Boolean,
    default: false,
  },
};

export type CroutonFormProps = ExtractPublicPropTypes<
  typeof CroutonFormProperties
>;

/** Result payload returned when the modal is submitted. */
export type CroutonFormData<DATA = any> = {
  /** The form data at the time of submission. */
  data: DATA;
  /** Whether the form passed validation. */
  valid: boolean;
};

export type CroutonFormEmitsType = {
  cancel: [value: null];
  /** Emitted when no resourceApi is defined. */
  save: [data: unknown];
  /** Emitted on successful save when resourceApi is defined. */
  onSaveSuccess: [response: unknown];
  /** Emitted on failed save when resourceApi is defined. */
  onSaveError: [error: unknown];
  /** Emitted on cancel or after save so the parent can close/clean up (matches FormModal). */
  closeModal: [result: CroutonFormData | null];
  /** Emitted when a custom renderer dispatches a form event. */
  events: [payload: FormEventPayload];
  /** Emitted when validation errors change. */
  errors: [errors: unknown];
  /** Emitted when form validity changes. */
  valid: [isValid: boolean];
};
