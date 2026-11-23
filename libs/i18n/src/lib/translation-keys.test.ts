import { describe, expect, it } from 'vitest';

import { layoutTitleKey, layoutTitleSlug } from './translation-keys';

describe('layoutTitleKey', () => {
  it('slugs the title under resources.<name>.layout', () => {
    expect(layoutTitleKey('book', 'General info')).toBe('resources.book.layout.general_info');
  });

  it('keeps non-latin letters and trims separators', () => {
    expect(layoutTitleSlug(' Überblick / Détails! ')).toBe('überblick_détails');
    expect(layoutTitleSlug('Ιστορία')).toBe('ιστορία');
    expect(layoutTitleSlug('—')).toBe('');
  });

  it('stays fast on long separator runs', () => {
    const start = performance.now();
    expect(layoutTitleSlug(`a${'_'.repeat(100_000)}!b`)).toBe('a_b');
    expect(performance.now() - start).toBeLessThan(200);
  });
});
