import { expect, test } from '@playwright/test';

import { LanguagePage } from '../../page-objects/LanguagePage';

test.describe('language persistence', () => {
  test('select NL, reload → app reopens in NL', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const lang = new LanguagePage(page);
    await lang.switchLanguage('nl');

    await page.reload();
    await page.waitForLoadState('networkidle');

    const current = await lang.getCurrentLanguage();
    expect(current).toBe('nl');
  });

  test('switch back to EN, reload → EN restored', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const lang = new LanguagePage(page);
    await lang.switchLanguage('nl');
    await lang.switchLanguage('en');

    await page.reload();
    await page.waitForLoadState('networkidle');

    const current = await lang.getCurrentLanguage();
    expect(current).toBe('en');
  });
});
