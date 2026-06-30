import type { ExtractPublicPropTypes, PropType } from 'vue';

import type { HttpClient } from '../http-client';
import type { ErrorMode } from './errorMode';

export type Data = {
  [key: string]: any;
};

export type SubmitFormEvent = {
  data: Data;
  valid: boolean;
};

export const JsonFormComponentProperties = {
  /** Unique identifier used to namespace the form element. */
  id: { type: String, required: true as const },
  /** HTML name attribute for the form. */
  name: { type: String, default: 'form' },
  /** JSON schema describing the shape of the form data. */
  schema: { type: Object as PropType<any>, required: true as const },
  /** UI schema describing the layout and controls. */
  uiSchema: { type: Object as PropType<any>, required: true as const },
  /** Disable all form controls. */
  disabled: { type: Boolean, default: false },
  /** Make all form controls readonly. */
  readonly: { type: Boolean, default: false },
  /** Current form data object. */
  formData: { type: Object as PropType<Data>, default: () => ({}) },
  /** When validation errors are shown (`'onBlur'`, `'onChange'`, `'onSubmit'`, `'always'`). */
  errorMode: {
    type: String as PropType<ErrorMode>,
    default: 'onChanges' as const,
  },
  /** HTTP client used by renderers that fetch remote data (e.g. autocomplete). */
  http: {
    type: [Object, Function] as PropType<HttpClient>,
    default: null,
  },
  /** Custom renderer registry. Overrides the default `customRenderers` when provided. */
  renderers: {
    type: Array as PropType<any[]>,
    default: null,
  },
};

export type JsonFormComponentProp = ExtractPublicPropTypes<
  typeof JsonFormComponentProperties
>;

export const JsonFormComponentEmits = [
  /** Emitted when form data changes. */
  'change',
  /** Emitted on form submission. */
  'submit',
  /** Emitted when validation errors change. */
  'errors',
  /** Emitted when form validity changes. */
  'valid',
  /** Emitted when a custom renderer dispatches a form event. */
  'events',
];
