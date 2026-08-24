/**
 * Translation registry: holds per-language bundles and provides a
 * `translatorFor(language)` factory. Loaded once at boot; dev mode
 * reloads from disk on each request.
 */

import {
  type I18nConfig,
  type TranslationBundle,
  type Translator,
  createTranslator,
} from '@ghentcdh/crouton-core';

import { IS_DEV } from '../dev-mode';
import { loadTranslationBundles } from './translation.loader';

export class TranslationRegistry {
  private bundles: Record<string, TranslationBundle>;

  constructor(
    private readonly translationsDir: string,
    private readonly i18nConfig: I18nConfig,
  ) {
    this.bundles = loadTranslationBundles(translationsDir);
  }

  get languages(): readonly string[] {
    return this.i18nConfig.languages;
  }

  get defaultLanguage(): string {
    return this.i18nConfig.defaultLanguage;
  }

  /** Whether i18n is active (at least one bundle loaded). */
  get active(): boolean {
    return Object.keys(this.bundles).length > 0;
  }

  translatorFor(language: string): Translator {
    if (IS_DEV) {
      this.bundles = loadTranslationBundles(this.translationsDir);
    }
    return createTranslator(
      this.bundles,
      language,
      this.i18nConfig.defaultLanguage,
    );
  }
}
