import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../page-objects/CroutonFormPage.js';
import { CroutonListPage } from '../page-objects/CroutonListPage.js';

const disableAnimations = async (page: any) => {
  await page.addStyleTag({
    content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
  });
};

test.describe('visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await disableAnimations(page);
  });

  test('books list snapshot', async ({ page }) => {
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    await expect(page).toHaveScreenshot('books-list.png', {
      maxDiffPixelRatio: 0.05,
      mask: [
        page.locator('td:first-child'),
        page.locator('td:has(> [class*="date"]), td:has(> time)'),
      ],
    });
  });

  test('book edit modal snapshot', async ({ page }) => {
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.waitForRows();
    await list.search('Book Title 1');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    await expect(modal).toHaveScreenshot('book-edit-modal.png', {
      maxDiffPixelRatio: 0.05,
      mask: [
        page.locator('[data-testid="form-modal"] input[type="text"]').first(),
        page.locator('[data-testid="form-modal"] input[type="date"]'),
      ],
    });
  });

  test('author detail modal snapshot (oneToMany sub-table)', async ({ page }) => {
    const list = new CroutonListPage(page);

    await list.navigateTo('author');
    await list.waitForRows();
    await list.search('George Orwell');
    await list.waitForRows();
    await list.clickView(0);

    const modal = page.getByTestId('form-modal');
    await modal.waitFor({ state: 'visible' });

    await expect(modal).toHaveScreenshot('author-detail-modal.png', {
      maxDiffPixelRatio: 0.05,
      mask: [
        page.locator('[data-testid="form-modal"] td:first-child'),
      ],
    });
  });
});
