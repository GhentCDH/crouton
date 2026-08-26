import type { AxiosInstance } from 'axios';
import { type Ref, ref } from 'vue';

const STORAGE_KEY = 'crouton.language';

const _language = ref<string>('');
const _languages = ref<string[]>([]);
const _defaultLanguage = ref<string>('en');
const _uiDictionary = ref<Record<string, unknown>>({});

/** Callback invoked after language changes — wired by useCrouton. */
let _onLanguageChange: (() => Promise<void>) | undefined;

export type LanguageConfig = {
  languages?: string[];
  defaultLanguage?: string;
  /** Initial language. Falls back to persisted → navigator → default. */
  initial?: string;
  /** Persist selected language in localStorage (default: true). */
  persist?: boolean;
};

/**
 * Configure the language system. Called from `useCrouton.init()` after
 * the layout response provides the available languages.
 */
export const configureLanguage = (cfg: LanguageConfig = {}) => {
  const { persist = true } = cfg;
  if (cfg.languages?.length) _languages.value = cfg.languages;
  if (cfg.defaultLanguage) _defaultLanguage.value = cfg.defaultLanguage;

  const initial =
    cfg.initial ??
    (persist ? localStorage.getItem(STORAGE_KEY) : null) ??
    navigatorLanguage(_languages.value) ??
    _defaultLanguage.value;

  _language.value = _languages.value.includes(initial)
    ? initial
    : _defaultLanguage.value;

  if (persist) {
    localStorage.setItem(STORAGE_KEY, _language.value);
  }
};

/**
 * Look up a key in the `ui` dictionary delivered by `/_app/layout`.
 * Supports dotted paths: `t('actions.save')`.
 * Returns `fallback` (defaults to the key itself) when the path is missing.
 */
const t = (path: string, fallback?: string): string => {
  const parts = path.split('.');
  let current: unknown = _uiDictionary.value;
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return fallback ?? path;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' && current !== '' ? current : (fallback ?? path);
};

/** Replace the ui dictionary (called internally by useCrouton after layout fetch). */
export const setUiDictionary = (dict: Record<string, unknown>) => {
  _uiDictionary.value = dict;
};

/**
 * Reactive language state for the application.
 *
 * Mirrors the `useApi()` singleton pattern: module-level refs, one
 * `configureLanguage()` call at boot, `useLanguage()` everywhere else.
 */
export const useLanguage = (): {
  language: Ref<string>;
  languages: Ref<string[]>;
  defaultLanguage: Ref<string>;
  setLanguage: (lang: string) => Promise<void>;
  t: (path: string, fallback?: string) => string;
} => ({
  language: _language,
  languages: _languages,
  defaultLanguage: _defaultLanguage,
  setLanguage,
  t,
});

/**
 * Change the active language. Updates the reactive ref, persists to
 * localStorage, and triggers a layout + FormDef refresh.
 */
const setLanguage = async (lang: string) => {
  if (!_languages.value.includes(lang)) return;
  _language.value = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  if (_onLanguageChange) await _onLanguageChange();
};

/** Register a callback for language changes (wired internally by useCrouton). */
export const onLanguageChange = (cb: () => Promise<void>) => {
  _onLanguageChange = cb;
};

/**
 * Add an axios request interceptor that sets `Accept-Language` on every
 * outgoing request. Call once after creating your axios instance.
 */
export const installLanguageHeader = (api: AxiosInstance) => {
  api.interceptors.request.use((config) => {
    const lang = _language.value;
    if (lang) {
      config.headers['Accept-Language'] = lang;
    }
    return config;
  });
};

/** Pick the best match from the browser's navigator.languages. */
const navigatorLanguage = (supported: string[]): string | undefined => {
  if (!supported.length || typeof navigator === 'undefined') return undefined;
  const lower = supported.map((s) => s.toLowerCase());
  for (const nav of navigator.languages ?? []) {
    const exact = lower.indexOf(nav.toLowerCase());
    if (exact !== -1) return supported[exact];
    const base = nav.split('-')[0].toLowerCase();
    const baseIdx = lower.indexOf(base);
    if (baseIdx !== -1) return supported[baseIdx];
  }
  return undefined;
};