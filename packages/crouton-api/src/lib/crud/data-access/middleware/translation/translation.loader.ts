/**
 * Read per-language translation bundles from disk.
 * Mirrors `enum-registry.loader.ts`.
 */

import type { TranslationBundle } from '@ghentcdh/crouton-core';

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const loadTranslationBundles = (
  translationsDir: string,
): Record<string, TranslationBundle> => {
  if (!existsSync(translationsDir)) return {};

  const bundles: Record<string, TranslationBundle> = {};
  const entries = readdirSync(translationsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const lang = entry.name.replace(/\.json$/, '');
    try {
      bundles[lang] = JSON.parse(
        readFileSync(join(translationsDir, entry.name), 'utf-8'),
      ) as TranslationBundle;
    } catch {
      /* skip malformed files */
    }
  }

  return bundles;
};
