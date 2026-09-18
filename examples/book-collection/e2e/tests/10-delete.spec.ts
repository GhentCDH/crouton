import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../page-objects/CroutonFormPage.js';
import { CroutonListPage } from '../page-objects/CroutonListPage.js';

test.describe('delete with confirmation modal', () => {
  test('delete author via confirm modal removes row', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    // Create a throwaway author to delete (avoids seed-data coupling)
    await list.navigateTo('author');
    await list.waitForRows();

    await list.clickCreate();
    await form.waitForModal();
    await form.fillField('Name', 'Author To Delete');
    await form.save();

    await list.search('Author To Delete');
    await list.waitForRows();
    const countBefore = await list.getRowCount();
    expect(countBefore).toBeGreaterThan(0);

    // Trigger delete — ModalService.showConfirm() renders a DOM modal (not browser dialog)
    await list.clickDelete(0);

    // Wait for confirm modal with title "Delete record"
    await expect(page.getByText('Delete record')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Are you sure to delete, the data will be lost?')).toBeVisible();

    // Confirm button defaults to "Ok" in @ghentcdh/ui ModalService
    await list.confirmDelete();

    // Row should be gone
    const countAfter = await list.getRowCount();
    expect(countAfter).toBeLessThan(countBefore);
  });

  test('cancelling delete modal keeps row', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);

    await list.navigateTo('author');
    await list.waitForRows();
    const countBefore = await list.getRowCount();

    await list.clickDelete(0);
    await expect(page.getByText('Delete record')).toBeVisible({ timeout: 5000 });

    // Cancel — button label is "Cancel"
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Delete record')).toBeHidden({ timeout: 3000 });

    const countAfter = await list.getRowCount();
    expect(countAfter).toBe(countBefore);
  });
});
