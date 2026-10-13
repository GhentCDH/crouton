import { expect, test } from '@playwright/test';

import { resetDb } from '../../helpers/reset-db';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

const disableAnimations = async (page: any) => {
  await page.addStyleTag({
    content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
  });
};

test.describe('categories visual regression', () => {
  test.beforeAll(async () => {
    await resetDb();
  });

  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
  });

  test('categories table', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('category');
    await list.waitForRows();

    await expect(page).toHaveScreenshot('categories-table.png', {
      maxDiffPixelRatio: 0.05,
      mask: [page.locator('td:first-child')],
    });
  });

  test('categories table with filter panel open', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('category');
    await list.waitForRows();
    await list.openFilterPanel();

    await expect(page).toHaveScreenshot('categories-table-filter-panel.png', {
      maxDiffPixelRatio: 0.05,
      mask: [page.locator('td:first-child')],
    });
  });

  test('category edit modal', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('category');
    await list.waitForRows();
    await list.search('Fiction');
    await list.waitForRows();
    await list.clickEdit(0);

    const modal = page.getByTestId('form-modal');
    await expect(modal).toHaveScreenshot('category-edit-modal.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('category view modal', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('category');
    await list.waitForRows();
    await list.search('Fantasy');
    await list.waitForRows();
    await list.clickView(0);

    const modal = page.getByTestId('form-modal');
    await modal.waitFor({ state: 'visible' });
    await expect(modal).toHaveScreenshot('category-view-modal.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});
