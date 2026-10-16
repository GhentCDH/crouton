import { expect, test } from '@playwright/test';

import { CroutonListPage } from '../../page-objects/CroutonListPage';
import { LanguagePage } from '../../page-objects/LanguagePage';

test.describe('i18n fallback', () => {
  test.afterEach(async ({ page }) => {
    const lang = new LanguagePage(page);
    await lang.switchLanguage('en').catch(() => undefined);
  });

  test('missing NL key falls back to English, no empty label', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    const lang = new LanguagePage(page);
    await lang.switchLanguage('nl');

    // "isbn" has no NL translation → must show original label (not empty, not path key)
    const isbnHeader = page.getByRole('columnheader', { name: /isbn/i });
    await expect(isbnHeader).toBeVisible();
    const text = await isbnHeader.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
    // Key path (e.g. "resources.book.columns.isbn") must not leak through
    expect(text).not.toContain('resources.');
  });
});
