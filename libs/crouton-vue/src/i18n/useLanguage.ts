import type { TranslationBundle } from '@crouton/i18n';
import type { AxiosInstance } from 'axios';
import { type Ref, ref } from 'vue';


import { getUiDefaults } from '../i18n/ui-defaults';

const STORAGE_KEY = 'crouton.language';

// Pre-seed from localStorage so the first Accept-Language header is not always 'en'.
// configureAllowedLanguages() corrects this if the plugin restricts the allowed set.
const _persistedLang =
  typeof localStorage !== 'undefined' ? (localStorage.getItem(STORAGE_KEY) ?? 'en') : 'en';

const _language = ref<string>(_persistedLang);
const _languages = ref<string[]>([]);
const _defaultLanguage = ref<string>('en');
const _displayNames = ref<Record<string, string>>({});
const _userUiDict = ref<Record<string, unknown>>({});
const _uiDictionary = ref<Record<string, unknown>>(
  getUiDefaults(_persistedLang) as Record<string, unknown>,
);

/** Full translation bundle for the current language (resources, enums, sidebarGroups, ui, validation). */
const _bundle = ref<TranslationBundle>({});

const mergeUiDictionary = () => {
  const defaults = getUiDefaults(_language.value) as Record<string, unknown>;
  const user = _userUiDict.value;
  const merged: Record<string, unknown> = { ...defaults };
  for (const key of Object.keys(user)) {
    const d = defaults[key];
    const u = user[key];
    if (d && typeof d === 'object' && u && typeof u === 'object') {
      merged[key] = { ...(d as object), ...(u as object) };
    } else {
      merged[key] = u;
    }
  }
  _uiDictionary.value = merged;
};

/** Callback invoked after language changes — wired by useCrouton. */
let _onLanguageChange: (() => Promise<void>) | undefined;

/**
 * Compute the supported language set from the backend list and the plugin's allowed list.
 *
 * Rules:
 * - No plugin list → use backend list as-is (today's behaviour).
 * - No backend i18n → use plugin list alone.
 * - Both present → intersection; if empty, fall back to plugin default and warn once.
 */
export const resolveLanguages = (
  backend: string[] | undefined,
  plugin: string[] | undefined,
): { supported: string[]; defaultLanguage: string } => {
  if (!plugin?.length) {
    const supported = backend ?? [];
    return { supported, defaultLanguage: supported[0] ?? 'en' };
  }
  if (!backend?.length) {
    return { supported: plugin, defaultLanguage: plugin[0] ?? 'en' };
  }
  const intersection = backend.filter((l) => plugin.includes(l));
  if (!intersection.length) {
    const fallback = plugin[0] ?? 'en';
    console.warn(
      `[crouton] No language overlap between backend [${backend.join(', ')}] and plugin [${plugin.join(', ')}]. Using "${fallback}".`,
    );
    return { supported: [fallback], defaultLanguage: fallback };
  }
  return { supported: intersection, defaultLanguage: intersection[0] };
};

export type LanguageConfig = {
  /** Languages from the backend (i18n.languages from /_app/layout). */
  languages?: string[];
  /** Plugin's allowed set — narrows the backend list. Passed from CroutonPlugin options. */
  allowed?: string[];
  defaultLanguage?: string;
  displayNames?: Record<string, string>;
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

  const { supported, defaultLanguage: resolvedDefault } = resolveLanguages(cfg.languages, cfg.allowed);

  if (supported.length) _languages.value = supported;

  // Effective default: plugin default if supported, backend default if supported, first supported.
  const effectiveDefault =
    (cfg.defaultLanguage && supported.includes(cfg.defaultLanguage)
      ? cfg.defaultLanguage
      : supported.includes(resolvedDefault)
        ? resolvedDefault
        : supported[0]) ?? 'en';
  _defaultLanguage.value = effectiveDefault;

  if (cfg.displayNames) _displayNames.value = cfg.displayNames;

  const persistedRaw =
    persist && typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  const persisted = persistedRaw && supported.includes(persistedRaw) ? persistedRaw : null;

  // Overwrite persisted value that is no longer in the supported set.
  if (persist && persistedRaw && !persisted && typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, effectiveDefault);
  }

  const initial =
    (cfg.initial && supported.includes(cfg.initial) ? cfg.initial : null) ??
    persisted ??
    navigatorLanguage(supported) ??
    effectiveDefault;

  _language.value = supported.includes(initial) ? initial : effectiveDefault;

  if (persist) {
    localStorage.setItem(STORAGE_KEY, _language.value);
  }

  mergeUiDictionary();
};

/**
 * Apply the plugin's i18n restriction at boot time, before the first backend request.
 * Corrects the module-level localStorage pre-seed if the persisted language is not allowed.
 * Called from CroutonPlugin.install before createCrouton.
 */
export const configureAllowedLanguages = (i18n?: {
  languages?: string[];
  defaultLanguage?: string;
  initial?: string;
}) => {
  if (!i18n?.languages?.length) return; // No restriction — keep today's behaviour.

  const pluginLanguages = i18n.languages;
  const pluginDefault = i18n.defaultLanguage ?? pluginLanguages[0] ?? 'en';

  let lang: string;
  if (i18n.initial && pluginLanguages.includes(i18n.initial)) {
    lang = i18n.initial;
  } else {
    const persisted =
      typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (persisted && pluginLanguages.includes(persisted)) {
      lang = persisted;
    } else {
      lang = pluginDefault;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, lang);
      }
    }
  }

  _language.value = lang;
  mergeUiDictionary();
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
  _userUiDict.value = dict;
  mergeUiDictionary();
};

/**
 * Look up a key in the full translation bundle (resources, enums, sidebarGroups, ui, validation).
 * Supports dotted paths: `translator('resources.books.columns.title')`.
 * Returns `fallback` (defaults to the key itself) when the path is missing.
 */
const translator = (path: string, fallback?: string): string => {
  const parts = path.split('.');
  let current: unknown = _bundle.value;
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return fallback ?? path;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' && current !== '' ? current : (fallback ?? path);
};

/** Replace the full translation bundle (called by useCrouton after /_app/translations fetch). */
export const setBundle = (bundle: TranslationBundle) => {
  _bundle.value = bundle;
  // Keep ui dict in sync so t() still works.
  if (bundle.ui) {
    _userUiDict.value = bundle.ui as Record<string, unknown>;
    mergeUiDictionary();
  }
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
  displayNames: Ref<Record<string, string>>;
  bundle: Ref<TranslationBundle>;
  setLanguage: (lang: string) => Promise<void>;
  /** Translate a key in the ui dictionary (backward-compat). */
  t: (path: string, fallback?: string) => string;
  /** Translate any key in the full bundle (resources, enums, sidebarGroups, ui, validation). */
  translator: (path: string, fallback?: string) => string;
} => ({
  language: _language,
  languages: _languages,
  defaultLanguage: _defaultLanguage,
  displayNames: _displayNames,
  bundle: _bundle,
  setLanguage,
  t,
  translator,
});

/**
 * Change the active language. Updates the reactive ref, persists to
 * localStorage, and triggers a layout + FormDef refresh.
 */
const setLanguage = async (lang: string) => {
  if (!_languages.value.includes(lang)) return;
  _language.value = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  mergeUiDictionary();
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
