import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../../page-objects/CroutonListPage';

test.describe('Number control — publishedYear field', () => {
  test.describe.configure({ mode: 'serial' });

  test('publishedYear accepts a numeric value and persists', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.search('De Vliegende Aap');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    const yearInput = modal.getByRole('spinbutton', { name: 'publishedYear' });
    await yearInput.clear();
    await yearInput.fill('1985');
    await page.keyboard.press('Tab');
    await form.waitForAutoSave();

    await list.search('De Vliegende Aap');
    await list.waitForRows();
    const row = list.getRows().first();
    await expect(row).toContainText('1985');
  });

  test('publishedYear shows in table column', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);

    await list.navigateTo('book');
    await list.waitForRows();

    const headers = page.getByRole('columnheader');
    await expect(headers.filter({ hasText: /year/i })).toBeVisible();
  });
});
