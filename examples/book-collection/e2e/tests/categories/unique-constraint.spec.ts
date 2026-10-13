import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

test.describe('category unique constraint', () => {
  test('creating category with duplicate slug shows error, modal stays open', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('category');
    await list.waitForRows();

    await list.clickCreate();
    await form.waitForModal();

    // "fiction" slug is seeded — must fail with unique constraint
    await form.fillField('Name', 'Duplicate Fiction');
    await form.fillField('Slug', 'fiction');

    await page.getByTestId('btn-save').click();

    await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('form-modal')).toBeVisible();
  });
});
