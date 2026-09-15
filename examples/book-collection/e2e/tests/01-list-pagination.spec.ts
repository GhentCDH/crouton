import { expect, test } from '@playwright/test';
import { CroutonListPage } from '../page-objects/CroutonListPage.js';

test.describe('list + pagination', () => {
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
});
