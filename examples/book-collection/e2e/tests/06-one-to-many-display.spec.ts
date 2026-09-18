import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../page-objects/CroutonFormPage.js';
import { CroutonListPage } from '../page-objects/CroutonListPage.js';

test.describe('oneToMany display', () => {
  test('author detail shows books section', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('author');
    await list.waitForRows();

    await list.search('Orwell');
    await page.waitForTimeout(400);
    await list.waitForRows();
    await list.clickView(0);

    await expect(page.getByTestId('form-modal')).toBeVisible();
    await expect(page.getByText(/books/i).first()).toBeVisible();

    await form.cancel();
  });
});
