import type { TranslationBundle } from './Translations.schema';

export type Translator = (path: string, fallback?: string) => string;

const getNestedValue = (
  obj: Record<string, unknown>,
  path: string,
): string | undefined => {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  if (typeof current === 'string' && current !== '') return current;
  return undefined;
};

export const createTranslator = (
  bundles: Record<string, TranslationBundle>,
  language: string,
  defaultLanguage = 'en',
): Translator => {
  const langBundle = bundles[language];
  const defaultBundle =
    language !== defaultLanguage ? bundles[defaultLanguage] : undefined;

  return (path: string, fallback?: string): string => {
    if (langBundle) {
      const value = getNestedValue(
        langBundle as unknown as Record<string, unknown>,
        path,
      );
      if (value !== undefined) return value;
    }

    if (defaultBundle) {
      const value = getNestedValue(
        defaultBundle as unknown as Record<string, unknown>,
        path,
      );
      if (value !== undefined) return value;
    }

    return fallback ?? path;
  };
};
