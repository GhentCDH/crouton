import { expect, test } from '@playwright/test';

import { resetDb } from '../../helpers/reset-db';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

const disableAnimations = async (page: any) => {
  await page.addStyleTag({
    content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
  });
};

test.describe('books visual regression', () => {
  test.beforeAll(async () => {
    await resetDb();
  });

  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
  });

  test('books table', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    await expect(page).toHaveScreenshot('books-table.png', {
      maxDiffPixelRatio: 0.05,
      mask: [page.locator('td:first-child')],
    });
  });

  test('books table with filter panel open', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();
    await list.openFilterPanel();

    await expect(page).toHaveScreenshot('books-table-filter-panel.png', {
      maxDiffPixelRatio: 0.05,
      mask: [page.locator('td:first-child')],
    });
  });

  test('books table with status filter applied', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();
    await list.openFilterPanel();
    await list.setFirstFilterField('Status');
    await list.setFirstFilterValueEnum('published');
    await list.applyFilter();
    await list.waitForRows();

    await expect(page).toHaveScreenshot('books-table-filter-applied.png', {
      maxDiffPixelRatio: 0.05,
      mask: [page.locator('td:first-child')],
    });
  });

  test('book edit modal', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();
    await list.search('De Ruimteslee');
    await list.waitForRows();
    await list.clickEdit(0);

    const modal = page.getByTestId('form-modal');
    await expect(modal).toHaveScreenshot('book-edit-modal.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('book edit modal rating component', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();
    await list.search('De Ruimteslee');
    await list.waitForRows();
    await list.clickEdit(0);

    const modal = page.getByTestId('form-modal');
    // Rating is rendered as a row of star buttons
    const ratingContainer = modal.locator('button').filter({ hasText: '★' }).first().locator('..');
    await expect(ratingContainer).toHaveScreenshot('book-rating-component.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('book view modal', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();
    await list.search('De Ruimteslee');
    await list.waitForRows();
    await list.clickView(0);

    const modal = page.getByTestId('form-modal');
    await modal.waitFor({ state: 'visible' });
    await expect(modal).toHaveScreenshot('book-view-modal.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('book edit modal categories relation', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();
    // De Ruimteslee has 2 categories: cat-1 and cat-4
    await list.search('De Ruimteslee');
    await list.waitForRows();
    await list.clickEdit(0);

    const modal = page.getByTestId('form-modal');
    // Expand the categories collapse section
    const categoriesToggle = modal.locator('input[type="checkbox"][aria-label="Toggle Categories"]');
    await categoriesToggle.check();
    await page.waitForTimeout(300);

    await expect(modal).toHaveScreenshot('book-edit-modal-categories.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('book rating stars in table row', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();
    await list.search('The Hobbit');
    await list.waitForRows();

    // The Hobbit has rating 5 — all stars should be yellow
    const firstRow = list.getRows().first();
    const ratingCell = firstRow.locator('td').filter({ has: page.locator('button').filter({ hasText: '★' }) });
    await expect(ratingCell).toHaveScreenshot('book-rating-in-table.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});
