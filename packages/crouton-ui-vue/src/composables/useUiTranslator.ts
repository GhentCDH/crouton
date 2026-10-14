import { type InjectionKey, inject } from 'vue';

export type UiTranslator = (path: string, fallback?: string) => string;

export const UI_TRANSLATOR_KEY: InjectionKey<UiTranslator> = Symbol('crouton.uiTranslator');

const passThrough: UiTranslator = (_path, fallback) => fallback ?? _path;

export const useUiTranslator = (): UiTranslator =>
  inject(UI_TRANSLATOR_KEY, passThrough);
