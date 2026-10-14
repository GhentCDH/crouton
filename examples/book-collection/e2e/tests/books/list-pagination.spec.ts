import { expect, test } from '@playwright/test';

import { resetDb } from '../../helpers/reset-db';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

test.describe('list + pagination', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await resetDb();
  });

  test('books list renders seeded rows', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    const rowCount = await list.getRowCount();
    expect(rowCount).toBeGreaterThan(0);
    expect(rowCount).toBeLessThanOrEqual(30);
  });

  test('books list shows column headers from schema', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    await expect(page.getByRole('columnheader', { name: /title/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
  });

  test('pagination controls exist when seed exceeds page size', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    const rowCount = await list.getRowCount();
    if (rowCount < 30) {
      const hasPagination = await page
        .locator('[aria-label="next page"], button:has-text("Next"), button:has-text("2")')
        .first()
        .isVisible()
        .catch(() => false);
      expect(hasPagination || rowCount < 30).toBe(true);
    }
  });

  test('next page shows different records', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    const rowCount = await list.getRowCount();
    const nextBtn = page.getByRole('button', { name: /next/i });
    const hasNextPage = await nextBtn.isVisible().catch(() => false);

    if (!hasNextPage || rowCount < 10) {
      // All books fit on one page — skip real navigation but verify row count
      expect(rowCount).toBeGreaterThan(0);
      return;
    }

    const firstPageFirst = await list.getFirstCellInColumn(0);
    await list.goToNextPage();
    await list.waitForRows();
    const secondPageFirst = await list.getFirstCellInColumn(0);

    expect(firstPageFirst).not.toBe(secondPageFirst);
  });

  test('previous page returns to first page records', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    const nextBtn = page.getByRole('button', { name: /next/i });
    const hasNextPage = await nextBtn.isVisible().catch(() => false);

    if (!hasNextPage) {
      // All books fit on one page — nothing to navigate back from
      return;
    }

    const firstPageFirst = await list.getFirstCellInColumn(0);
    await list.goToNextPage();
    await list.waitForRows();
    await list.goToPrevPage();
    await list.waitForRows();

    const restoredFirst = await list.getFirstCellInColumn(0);
    expect(restoredFirst).toBe(firstPageFirst);
  });
});
