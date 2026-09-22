import { expect, test } from '@playwright/test';

import { CroutonListPage } from '../../page-objects/CroutonListPage';

test.describe.serial('search + filter', () => {
  test('search narrows book results', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    const totalRows = await list.getRowCount();
    await list.search('Book Title 1');

    const filteredRows = await list.getRowCount();
    expect(filteredRows).toBeGreaterThan(0);
    expect(filteredRows).toBeLessThanOrEqual(totalRows);
  });

  test('clearing search restores full results', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    const totalRows = await list.getRowCount();

    await list.search('Book Title 28');
    await expect(async () => {
      const count = await list.getRowCount();
      expect(count).toBeLessThan(totalRows);
    }).toPass({ timeout: 5000 });

    await list.clearSearch();
    await expect(async () => {
      const count = await list.getRowCount();
      expect(count).toBe(totalRows);
    }).toPass({ timeout: 5000 });
  });

  test('author search finds seeded authors', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('author');
    await list.waitForRows();

    await list.search('Orwell');
    await expect(page.getByRole('cell', { name: 'George Orwell' })).toBeVisible({ timeout: 5000 });

    const rows = await list.getRowCount();
    expect(rows).toBe(1);
  });
});
