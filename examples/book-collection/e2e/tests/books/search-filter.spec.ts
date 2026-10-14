import { expect, test } from '@playwright/test';

import { resetDb } from '../../helpers/reset-db';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

test.describe.serial('search + filter', () => {
  test.beforeAll(async () => {
    await resetDb();
  });

  test('search narrows book results', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    const totalRows = await list.getRowCount();
    await list.search('De Ruimteslee');

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

    await list.search('The Fall of Gondolin');
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

    await list.search('Vandersteen');
    await expect(page.getByRole('cell', { name: 'Willy Vandersteen' })).toBeVisible({ timeout: 5000 });

    const rows = await list.getRowCount();
    expect(rows).toBe(1);
  });

  test('filter by author shows only that author\'s books', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    const totalRows = await list.getRowCount();

    await list.openFilterPanel();
    await list.setFirstFilterField('Author');
    await list.setFirstFilterValue('Willy Vandersteen');
    await list.applyFilter();

    // Seed: Vandersteen has 8 books — verify filter narrows results
    await expect(async () => {
      const count = await list.getRowCount();
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(totalRows);
    }).toPass({ timeout: 5000 });
  });

  test('resetting author filter restores full book list', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    const totalRows = await list.getRowCount();

    await list.openFilterPanel();
    await list.setFirstFilterField('Author');
    await list.setFirstFilterValue('Willy Vandersteen');
    await list.applyFilter();
    await list.waitForRows();

    await list.openFilterPanel();
    await list.resetFilter();

    await expect(async () => {
      expect(await list.getRowCount()).toBe(totalRows);
    }).toPass({ timeout: 5000 });
  });
});
