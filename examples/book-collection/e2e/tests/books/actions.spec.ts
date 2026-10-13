import { expect, test } from '@playwright/test';

import { CroutonListPage } from '../../page-objects/CroutonListPage';

test.describe('book actions', () => {
  test.describe.configure({ mode: 'serial' });

  test('table action: Search Open Library button is visible in toolbar', async ({
    page,
  }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    await expect(
      page.getByRole('button', { name: /search open library/i }),
    ).toBeVisible();
  });

  test('table action: Search Open Library opens openlibrary.org in new tab', async ({
    page,
  }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    const [newTab] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('button', { name: /search open library/i }).click(),
    ]);

    await newTab.waitForLoadState('domcontentloaded');
    expect(newTab.url()).toContain('openlibrary.org');
  });

  test('row action: Open on Open Library button visible for book with isbn', async ({
    page,
  }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    // Seed: The Hobbit has an isbn
    await list.search('The Hobbit');
    await list.waitForRows();

    const firstRow = list.getRows().first();
    await firstRow.hover();
    await expect(
      firstRow.getByRole('button', { name: /open on open library/i }),
    ).toBeVisible();
  });

  test('row action: Open on Open Library opens isbn url in new tab', async ({
    page,
  }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    await list.search('The Hobbit');
    await list.waitForRows();

    const firstRow = list.getRows().first();
    await firstRow.hover();

    const [newTab] = await Promise.all([
      page.waitForEvent('popup'),
      firstRow.getByRole('button', { name: /open on open library/i }).click(),
    ]);

    await newTab.waitForLoadState('domcontentloaded');
    expect(newTab.url()).toContain('openlibrary.org/isbn/');
  });
});
