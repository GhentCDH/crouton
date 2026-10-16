import { describe, expect, it } from 'vitest';

import { defaults } from './ui-defaults';

describe('ui-defaults key symmetry', () => {
  const langs = Object.keys(defaults);
  const ref = defaults['en'];

  const flatKeys = (dict: Record<string, Record<string, string>>): string[] =>
    Object.entries(dict).flatMap(([section, entries]) =>
      Object.keys(entries).map((key) => `${section}.${key}`),
    );

  const refKeys = flatKeys(ref).sort();

  for (const lang of langs) {
    if (lang === 'en') continue;
    it(`${lang} has same keys as en`, () => {
      expect(flatKeys(defaults[lang]).sort()).toEqual(refKeys);
    });
  }
});
