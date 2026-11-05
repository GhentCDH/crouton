import type { InjectionKey, Ref } from 'vue';

export type ErrorMode = 'onBlur' | 'onChange' | 'onSubmit' | 'always';

export const ERROR_MODE_KEY: InjectionKey<Ref<ErrorMode>> =
  Symbol('errorMode');

export const FORM_SUBMITTED_KEY: InjectionKey<Ref<boolean>> =
  Symbol('formSubmitted');

export const FORM_READONLY_KEY: InjectionKey<Ref<boolean>> =
  Symbol('formReadonly');
