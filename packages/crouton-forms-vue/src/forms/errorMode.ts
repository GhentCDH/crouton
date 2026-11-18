import type { InjectionKey, Ref } from 'vue';

export type ErrorMode = 'onBlur' | 'onChange' | 'onSubmit' | 'always';

export const ERROR_MODE_KEY: InjectionKey<Ref<ErrorMode>> =
  Symbol('errorMode');

export const FORM_SUBMITTED_KEY: InjectionKey<Ref<boolean>> =
  Symbol('formSubmitted');

export const FORM_READONLY_KEY: InjectionKey<Ref<boolean>> =
  Symbol('formReadonly');

/**
 * True when optional properties accept `null` (API-backed forms). Controls then
 * store a cleared value as `null` so an autosave PATCH sends it — `undefined`
 * keys are dropped by JSON.stringify and the server would keep the old value.
 */
export const FORM_NULLABLE_KEY: InjectionKey<Ref<boolean>> =
  Symbol('formNullable');
