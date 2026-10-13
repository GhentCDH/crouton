import { expect, test } from '@playwright/test';

import { resetDb } from '../../helpers/reset-db';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

test.describe('books sort', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await resetDb();
  });

  test('sort by title changes first row from default order', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    const unsorted = await list.getFirstRowText();

    // Default is title ASC; one click → title DESC
    await list.clickColumnHeader('Title');
    await list.waitForRows();
    const sorted = await list.getFirstRowText();

    expect(sorted).not.toBe(unsorted);
  });

  test('sort by title desc: sorted row appears after default-sort row', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    const unsorted = await list.getFirstRowText();

    // Default is title ASC (first sortable column); one click toggles to DESC
    await list.clickColumnHeader('Title');
    await list.waitForRows();
    const sorted = await list.getFirstRowText();

    expect(sorted.trim().length).toBeGreaterThan(0);
    // DESC-sorted title should be lexicographically ≥ default title-ASC first row
    expect(sorted.trim().localeCompare(unsorted.trim())).toBeGreaterThanOrEqual(0);
  });

  test('sort by publishedYear changes row order', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    await list.clickColumnHeader('Published Year');
    await list.waitForRows();
    const asc = await list.getFirstRowText();

    await list.clickColumnHeader('Published Year');
    await list.waitForRows();
    const desc = await list.getFirstRowText();

    expect(asc).not.toBe(desc);
  });

  test('sort by status changes row order', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    await list.clickColumnHeader('Status');
    await list.waitForRows();
    const asc = await list.getFirstRowText();

    await list.clickColumnHeader('Status');
    await list.waitForRows();
    const desc = await list.getFirstRowText();

    expect(asc).not.toBe(desc);
  });
});
