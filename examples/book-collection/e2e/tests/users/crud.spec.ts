import { expect, test } from '@playwright/test';

import { resetDb } from '../../helpers/reset-db';
import { CroutonFormPage } from '../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

test.describe('users crud', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await resetDb();
  });

  test('create user', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('user');
    await list.waitForRows();

    await list.clickCreate();
    await form.waitForModal();

    await form.fillField('Name', 'Test User');
    await form.fillField('Email', 'testuser@example.com');
    await form.save();

    await list.waitForRows();
    await list.search('Test User');
    await expect(page.getByRole('cell', { name: 'Test User' })).toBeVisible({ timeout: 5000 });
  });

  test('edit user name', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('user');
    await list.waitForRows();

    await list.search('Test User');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    await form.fillField('Name', 'Test User Renamed');
    await page.keyboard.press('Tab');
    await form.waitForAutoSave();

    await list.search('Test User Renamed');
    await expect(page.getByRole('cell', { name: 'Test User Renamed' })).toBeVisible({ timeout: 5000 });
  });

  test('delete user', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('user');
    await list.waitForRows();

    await list.clickCreate();
    await form.waitForModal();
    await form.fillField('Name', 'User To Delete');
    await form.fillField('Email', 'delete-me@example.com');
    await form.save();

    await list.search('User To Delete');
    await list.waitForRows();

    await list.clickDelete(0);
    await expect(page.getByText('Delete record')).toBeVisible({ timeout: 5000 });
    await list.confirmDelete();
    await list.waitForNoRow();
  });
});
