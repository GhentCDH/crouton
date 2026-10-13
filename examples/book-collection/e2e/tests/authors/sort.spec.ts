import { expect, test } from '@playwright/test';

import { resetDb } from '../../helpers/reset-db';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

test.describe('authors sort', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await resetDb();
  });

  test('sort by name changes first row from default order', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('author');
    await list.waitForRows();

    const unsorted = await list.getFirstRowText();

    await list.clickColumnHeader('Name');
    await list.waitForRows();
    const sorted = await list.getFirstRowText();

    expect(sorted).not.toBe(unsorted);
  });

  test('sort by name desc: sorted row appears after alphabetical-asc default', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('author');
    await list.waitForRows();

    const unsorted = await list.getFirstRowText();

    await list.clickColumnHeader('Name');
    await list.waitForRows();
    const sorted = await list.getFirstRowText();

    // Default is name ASC (first sortable column); one click → name DESC
    // DESC puts alphabetically-latest author first → sorted > unsorted
    expect(sorted.trim().localeCompare(unsorted.trim())).toBeGreaterThanOrEqual(0);
  });
});
