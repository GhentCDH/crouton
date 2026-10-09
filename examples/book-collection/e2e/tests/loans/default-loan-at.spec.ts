import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

test.describe('loan loanedAt default', () => {
  test('loanedAt defaults to today', async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);

    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('loan');
    await list.waitForRows();

    await list.clickCreate();
    await form.waitForModal();

    const value = await page.locator('input#loanedAt').inputValue();
    expect(value).toBe(today);
  });
});
