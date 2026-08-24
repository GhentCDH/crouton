/**
 * Per-request language context using AsyncLocalStorage.
 *
 * The LanguageInterceptor stores the resolved language; downstream code
 * reads it via `getRequestLanguage()` without threading a parameter
 * through every function signature.
 *
 * Outside a request scope (tests, CLI), returns the default language.
 */

import { AsyncLocalStorage } from 'node:async_hooks';

const languageStore = new AsyncLocalStorage<string>();

/** Run a callback within a language context. */
export const runWithLanguage = <T>(language: string, fn: () => T): T =>
  languageStore.run(language, fn);

/** Get the current request's resolved language, or `defaultLanguage` if none. */
export const getRequestLanguage = (defaultLanguage = 'en'): string =>
  languageStore.getStore() ?? defaultLanguage;
