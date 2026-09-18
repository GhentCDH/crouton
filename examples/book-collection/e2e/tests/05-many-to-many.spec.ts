import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../page-objects/CroutonFormPage.js';
import { CroutonListPage } from '../page-objects/CroutonListPage.js';

test.describe('manyToMany relation', () => {
  test('book edit form shows categories relation editor', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.waitForRows();

    await list.search('Book Title 2');
    await page.waitForTimeout(400);
    await list.waitForRows();
    await list.clickEdit(0);

    await expect(page.getByTestId('form-modal')).toBeVisible();
    await expect(page.getByText(/categories/i).first()).toBeVisible();

    await form.cancel();
  });
});
