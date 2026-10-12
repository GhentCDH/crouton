import type { KeyValueStorage } from '../api/ports';
import { type Store, createStore } from '../store';

const STORAGE_KEY = 'crouton.language';

export type LanguageConfig = {
  languages?: string[];
  defaultLanguage?: string;
  initial?: string;
  persist?: boolean;
};

export type LanguageStore = {
  language: Store<string>;
  languages: Store<string[]>;
  defaultLanguage: Store<string>;
  uiDictionary: Store<Record<string, unknown>>;
  configure: (cfg: LanguageConfig) => void;
  setLanguage: (lang: string) => Promise<void>;
  setUiDictionary: (dict: Record<string, unknown>) => void;
  onLanguageChange: (cb: () => Promise<void>) => void;
  t: (path: string, fallback?: string) => string;
};

const navigatorLanguage = (supported: string[]): string | undefined => {
  if (!supported.length || typeof navigator === 'undefined') return undefined;
  const lower = supported.map((s) => s.toLowerCase());
  for (const nav of (navigator.languages ?? [])) {
    const exact = lower.indexOf(nav.toLowerCase());
    if (exact !== -1) return supported[exact];
    const base = nav.split('-')[0].toLowerCase();
    const baseIdx = lower.indexOf(base);
    if (baseIdx !== -1) return supported[baseIdx];
  }
  return undefined;
};

export const createLanguageStore = (storage?: KeyValueStorage): LanguageStore => {
  const language = createStore<string>('');
  const languages = createStore<string[]>([]);
  const defaultLanguage = createStore<string>('en');
  const uiDictionary = createStore<Record<string, unknown>>({});
  let _onLanguageChange: (() => Promise<void>) | undefined;

  const t = (path: string, fallback?: string): string => {
    const parts = path.split('.');
    let current: unknown = uiDictionary.get();
    for (const part of parts) {
      if (current === null || typeof current !== 'object') return fallback ?? path;
      current = (current as Record<string, unknown>)[part];
    }
    return typeof current === 'string' && current !== '' ? current : (fallback ?? path);
  };

  const configure = (cfg: LanguageConfig = {}) => {
    const { persist = true } = cfg;
    if (cfg.languages?.length) languages.set(cfg.languages);
    if (cfg.defaultLanguage) defaultLanguage.set(cfg.defaultLanguage);

    const stored = persist ? (storage?.getItem(STORAGE_KEY) ?? null) : null;
    const initial =
      cfg.initial ??
      stored ??
      navigatorLanguage(languages.get()) ??
      defaultLanguage.get();

    const resolved = languages.get().includes(initial) ? initial : defaultLanguage.get();
    language.set(resolved);

    if (persist) storage?.setItem(STORAGE_KEY, resolved);
  };

  const setLanguage = async (lang: string) => {
    if (!languages.get().includes(lang)) return;
    language.set(lang);
    storage?.setItem(STORAGE_KEY, lang);
    if (_onLanguageChange) await _onLanguageChange();
  };

  return {
    language,
    languages,
    defaultLanguage,
    uiDictionary,
    configure,
    setLanguage,
    setUiDictionary: (dict) => uiDictionary.set(dict),
    onLanguageChange: (cb) => { _onLanguageChange = cb; },
    t,
  };
};
