import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

test.describe('Cancel create — changes not persisted', () => {
  test.describe.configure({ mode: 'serial' });

  test('cancelling create form does not add new record', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.waitForRows();

    const countBefore = await list.getRowCount();

    await list.clickCreate();
    // Fill required field but cancel before saving
    const modal = page.getByTestId('form-modal');
    await modal.getByLabel('Title', { exact: false }).fill('Cancelled Book Test');

    // Click Cancel without saving
    await form.cancel();

    // Clear any search to show full list
    await list.clearSearch();
    await list.waitForRows();

    const countAfter = await list.getRowCount();
    expect(countAfter).toBe(countBefore);
  });

  test('cancelled create title does not appear in list', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.waitForRows();

    await list.clickCreate();
    const modal = page.getByTestId('form-modal');
    await modal.getByLabel('Title', { exact: false }).fill('ShouldNotExist_XYZ123');
    await form.cancel();

    // Search for the cancelled title — should not be found
    await list.search('ShouldNotExist_XYZ123');
    await expect(list.getRows().filter({ hasText: 'ShouldNotExist_XYZ123' })).toHaveCount(0);
  });
});
