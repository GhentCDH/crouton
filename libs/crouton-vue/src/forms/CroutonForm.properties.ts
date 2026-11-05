import type { PropType } from 'vue';

import { type ViewConfig } from '@ghentcdh/crouton-core';
import {
  type FormEventPayload,
  type FormModalResult,
  SharedFormProperties,
} from '@ghentcdh/crouton-forms-vue';

import { type ResourceApiInstance } from '../resource';

export const CroutonFormProperties = {
  /** Title displayed in the modal header. */
  title: { type: String, required: false as const },
  /** Label for the save button. */
  saveLabel: { type: String, default: 'Save' },
  /** Label for the cancel button. */
  cancelLabel: { type: String, default: 'Cancel' },
  layout: { type: String, default: 'rows' },

  ...SharedFormProperties,

  formMaxWidth: {
    type: String,
    default: 'w-full',
  },
  views: {
    type: Object as PropType<Record<string, ViewConfig>>,
    required: true as const,
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
    default: undefined,
  },
  debugValue: {
    type: Boolean,
    default: undefined,
  },
};

/** Result payload returned when the modal is submitted. */
export type CroutonFormData<DATA = any> = FormModalResult<DATA>;

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
