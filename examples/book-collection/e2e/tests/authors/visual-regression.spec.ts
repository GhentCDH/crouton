import { expect, test } from '@playwright/test';

import { resetDb } from '../../helpers/reset-db';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

const disableAnimations = async (page: any) => {
  await page.addStyleTag({
    content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
  });
};

test.describe('authors visual regression', () => {
  test.beforeAll(async () => {
    await resetDb();
  });

  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
  });

  test('authors table', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('author');
    await list.waitForRows();

    await expect(page).toHaveScreenshot('authors-table.png', {
      maxDiffPixelRatio: 0.05,
      mask: [page.locator('td:first-child')],
    });
  });

  test('authors table with filter panel open', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('author');
    await list.waitForRows();
    await list.openFilterPanel();

    await expect(page).toHaveScreenshot('authors-table-filter-panel.png', {
      maxDiffPixelRatio: 0.05,
      mask: [page.locator('td:first-child')],
    });
  });

  test('author edit modal', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('author');
    await list.waitForRows();
    await list.search('Tolkien');
    await list.waitForRows();
    await list.clickEdit(0);

    const modal = page.getByTestId('form-modal');
    await expect(modal).toHaveScreenshot('author-edit-modal.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('author view modal with books relation (oneToMany sub-table)', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('author');
    await list.waitForRows();
    await list.search('Tolkien');
    await list.waitForRows();
    await list.clickView(0);

    const modal = page.getByTestId('form-modal');
    await modal.waitFor({ state: 'visible' });
    // Wait for books relation content to load (Tolkien's first book alphabetically)
    await modal.getByText(/Fellowship|Hobbit|Silmarillion|Tolkien/i).first().waitFor({ state: 'visible', timeout: 5000 });

    await expect(modal).toHaveScreenshot('author-view-modal-books-relation.png', {
      maxDiffPixelRatio: 0.05,
      mask: [modal.locator('td:first-child')],
    });
  });
});
