import { expect, test } from '@playwright/test';

import { resetDb } from '../../helpers/reset-db';
import { CroutonFormPage } from '../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

test.describe('categories crud', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await resetDb();
  });

  test('create category', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('category');
    await list.waitForRows();

    await list.clickCreate();
    await form.waitForModal();

    await form.fillField('Name', 'Test Category');
    await form.fillField('Slug', 'test-category');
    await form.save();

    await list.waitForRows();
    await list.search('Test Category');
    await expect(page.getByRole('cell', { name: 'Test Category' })).toBeVisible({ timeout: 5000 });
  });

  test('edit category name', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('category');
    await list.waitForRows();

    await list.search('Test Category');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    await form.fillField('Name', 'Test Category Renamed');
    await page.keyboard.press('Tab');
    await form.waitForAutoSave();

    await list.search('Test Category Renamed');
    await expect(page.getByRole('cell', { name: 'Test Category Renamed' })).toBeVisible({ timeout: 5000 });
  });

  test('delete category with confirm removes row', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('category');
    await list.waitForRows();

    await list.clickCreate();
    await form.waitForModal();
    await form.fillField('Name', 'To Delete');
    await form.fillField('Slug', 'to-delete');
    await form.save();

    await list.search('To Delete');
    await list.waitForRows();

    await list.clickDelete(0);
    await expect(page.getByText('Delete record')).toBeVisible({ timeout: 5000 });
    await list.confirmDelete();
    await list.waitForNoRow();
  });

  test('cancel delete keeps row', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);

    await list.navigateTo('category');
    await list.waitForRows();
    const countBefore = await list.getRowCount();

    await list.clickDelete(0);
    await expect(page.getByText('Delete record')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Delete record')).toBeHidden({ timeout: 3000 });

    const countAfter = await list.getRowCount();
    expect(countAfter).toBe(countBefore);
  });
});
