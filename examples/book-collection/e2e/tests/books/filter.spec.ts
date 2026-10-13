import { expect, test } from '@playwright/test';

import { resetDb } from '../../helpers/reset-db';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

test.describe('books filter enhancements', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await resetDb();
  });

  test('filter by status published shows only published books', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    const totalRows = await list.getRowCount();

    await list.openFilterPanel();
    await list.setFirstFilterField('Status');
    await list.setFirstFilterValueEnum('published');
    await list.applyFilter();

    await expect(async () => {
      const count = await list.getRowCount();
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(totalRows);
    }).toPass({ timeout: 5000 });

    // All visible rows should contain "published"
    const rows = list.getRows();
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText(/published/i);
    }
  });

  test('combine text search and filter narrows results', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    // First: filter by author Tolkien
    await list.openFilterPanel();
    await list.setFirstFilterField('Author');
    await list.setFirstFilterValue('J.R.R. Tolkien');
    await list.applyFilter();
    await list.waitForRows();

    const filteredCount = await list.getRowCount();

    // Then add search to narrow further
    await list.search('Hobbit');
    await expect(async () => {
      const count = await list.getRowCount();
      expect(count).toBeLessThanOrEqual(filteredCount);
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: 5000 });
  });

  test('reset clears all filters and restores full list', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    const totalRows = await list.getRowCount();

    await list.openFilterPanel();
    await list.setFirstFilterField('Status');
    await list.setFirstFilterValueEnum('archived');
    await list.applyFilter();
    await list.waitForRows();

    await list.openFilterPanel();
    await list.resetFilter();

    await expect(async () => {
      expect(await list.getRowCount()).toBe(totalRows);
    }).toPass({ timeout: 5000 });
  });
});
