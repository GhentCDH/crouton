import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../page-objects/CroutonFormPage.js';
import { CroutonListPage } from '../page-objects/CroutonListPage.js';

test.describe('enum/status display', () => {
  test('status column renders enum value', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);

    await list.navigateTo('book');
    await list.waitForRows();

    // Seed: book-1 has status "draft" (index 0, cycling draft/published/archived)
    await list.search('Book Title 1');
    await list.waitForRows();

    const rows = list.getRows();
    const firstRow = rows.first();
    await expect(firstRow).toContainText(/draft/i);
  });

  test('status column renders Published label for published books', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);

    await list.navigateTo('book');
    await list.waitForRows();

    // Seed: book-2 has status "published"
    await list.search('Book Title 2');
    await list.waitForRows();

    const firstRow = list.getRows().first();
    await expect(firstRow).toContainText(/published/i);
  });

  test('status can be changed via enum select in edit form', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.waitForRows();

    // Edit book-1 (status=draft) and change to Published
    await list.search('Book Title 1');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const statusSelect = page.getByLabel(/status/i);
    await statusSelect.selectOption('published');

    await form.save();

    // Verify status updated in table
    await list.search('Book Title 1');
    await list.waitForRows();
    const firstRow = list.getRows().first();
    await expect(firstRow).toContainText(/published/i);

    // Reset back to draft for test isolation
    await list.clickEdit(0);
    await form.waitForModal();
    await page.getByLabel(/status/i).selectOption('draft');
    await form.save();
  });
});
