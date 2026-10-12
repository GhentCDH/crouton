import type { AxiosInstance } from 'axios';
import { type Ref, onScopeDispose, shallowRef } from 'vue';

import {
  type LanguageConfig,
  createLanguageStore,
} from '@ghentcdh/crouton-frontend-core';

export type { LanguageConfig };

const _store = createLanguageStore(
  typeof localStorage !== 'undefined' ? localStorage : undefined,
);

export const configureLanguage = (cfg: LanguageConfig = {}) => _store.configure(cfg);
export const setUiDictionary = (dict: Record<string, unknown>) => _store.setUiDictionary(dict);
export const onLanguageChange = (cb: () => Promise<void>) => _store.onLanguageChange(cb);

export const useLanguage = (): {
  language: Ref<string>;
  languages: Ref<string[]>;
  defaultLanguage: Ref<string>;
  setLanguage: (lang: string) => Promise<void>;
  t: (path: string, fallback?: string) => string;
} => {
  const language = shallowRef(_store.language.get());
  const languages = shallowRef(_store.languages.get());
  const defaultLanguage = shallowRef(_store.defaultLanguage.get());

  const u1 = _store.language.subscribe((v) => { language.value = v; });
  const u2 = _store.languages.subscribe((v) => { languages.value = v; });
  const u3 = _store.defaultLanguage.subscribe((v) => { defaultLanguage.value = v; });
  onScopeDispose(() => { u1(); u2(); u3(); });

  return {
    language,
    languages,
    defaultLanguage,
    setLanguage: _store.setLanguage,
    t: _store.t,
  };
};

export const installLanguageHeader = (api: AxiosInstance) => {
  api.interceptors.request.use((config) => {
    const lang = _store.language.get();
    if (lang) config.headers['Accept-Language'] = lang;
    return config;
  });
};
