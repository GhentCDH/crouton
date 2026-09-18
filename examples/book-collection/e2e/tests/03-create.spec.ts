import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../page-objects/CroutonFormPage.js';
import { CroutonListPage } from '../page-objects/CroutonListPage.js';

test.describe('create', () => {
  test('create new author via form', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('author');
    await list.waitForRows();

    await list.clickCreate();
    await form.waitForModal();

    await form.fillField('Name', 'Test Author Created');
    await form.fillField('Bio', 'A biography for the test author.');

    await form.save();

    await list.waitForRows();
    await list.search('Test Author Created');
    await expect(page.getByRole('cell', { name: 'Test Author Created' })).toBeVisible({ timeout: 5000 });
  });

  test('required field validation prevents save', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);

    await list.navigateTo('author');
    await list.waitForRows();
    await list.clickCreate();

    const saveBtn = page.getByTestId('btn-save');
    const isDisabled = await saveBtn.isDisabled();
    if (!isDisabled) {
      await saveBtn.click();
      await expect(page.getByTestId('form-modal')).toBeVisible();
    } else {
      expect(isDisabled).toBe(true);
    }
  });
});
