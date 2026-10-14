import { expect, test } from '@playwright/test';

import { resetDb } from '../../helpers/reset-db';
import { CroutonFormPage } from '../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

test.describe('authors update', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await resetDb();
  });

  test('edit author name', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('author');
    await list.waitForRows();

    await list.search('J.R.R. Tolkien');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    await form.fillField('Name', 'John Ronald Tolkien');
    await page.keyboard.press('Tab');
    await form.waitForAutoSave();

    await list.search('John Ronald Tolkien');
    await expect(page.getByRole('cell', { name: 'John Ronald Tolkien' })).toBeVisible({ timeout: 5000 });
  });

  test('edit author bio (textarea)', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('author');
    await list.waitForRows();

    await list.search('John Ronald Tolkien');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    await form.fillField('Bio', 'Updated biography for Tolkien.');
    await page.keyboard.press('Tab');
    await form.waitForAutoSave();

    // Verify by reopening
    await list.search('John Ronald Tolkien');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const bioValue = await form.getFieldValue('Bio');
    expect(bioValue).toContain('Updated biography');

    await form.cancel();
  });

  test('saved author name appears in list', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);

    await list.navigateTo('author');
    await list.waitForRows();

    await list.search('John Ronald Tolkien');
    await expect(page.getByRole('cell', { name: 'John Ronald Tolkien' })).toBeVisible({ timeout: 5000 });
  });
});
