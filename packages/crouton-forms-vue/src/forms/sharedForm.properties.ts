import type { PropType } from 'vue';

import type { FormEventPayload } from '../composables/useFormEvents';
import type { HttpClient } from '../http-client';
import type { ErrorMode } from './errorMode';

/**
 * Props shared by every form wrapper (FormModal, CroutonForm).
 * Wrappers spread this object and only declare the props unique to them, so
 * the form-event/http/auto-save contract is defined once.
 */
export const SharedFormProperties = {
  /** Callback for form events dispatched by custom renderers. */
  onEvents: {
    type: Function as PropType<(payload: FormEventPayload) => void>,
    required: false,
  },
  /** Initial form data to populate the form with. */
  data: { type: Object as PropType<Record<string, unknown>>, required: true as const },
  /** When validation errors are shown. */
  errorMode: {
    type: String as PropType<ErrorMode>,
    default: 'onBlur' as const,
    required: false,
  },
  /** HTTP client passed through to the inner form for remote renderers (e.g. autocomplete). */
  http: {
    type: [Object, Function] as PropType<HttpClient>,
    default: null,
    required: false,
  },
  /** Custom renderer registry passed to the inner form. */
  renderers: {
    type: Array as PropType<unknown[]>,
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
    type: Function as PropType<(data: Record<string, unknown>) => Promise<unknown>>,
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
    type: Function as PropType<() => Promise<unknown>>,
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
};
