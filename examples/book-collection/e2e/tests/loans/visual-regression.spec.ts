import { expect, test } from '@playwright/test';

import { resetDb } from '../../helpers/reset-db';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

const disableAnimations = async (page: any) => {
  await page.addStyleTag({
    content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
  });
};

test.describe('loans visual regression', () => {
  test.beforeAll(async () => {
    await resetDb();
  });

  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
  });

  test('loans table', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('loan');
    await list.waitForRows();

    await expect(page).toHaveScreenshot('loans-table.png', {
      maxDiffPixelRatio: 0.05,
      mask: [page.locator('td:first-child')],
    });
  });

  test('loan edit modal with date and relation fields', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('loan');
    await list.waitForRows();
    // loan-2: Bob Jones / De Nerveuze Neushoorn — row index 1 sorted by loanedAt asc
    // Loans has no searchable columns — use row index directly
    await list.clickEdit(1);

    const modal = page.getByTestId('form-modal');
    await expect(modal).toHaveScreenshot('loan-edit-modal.png', {
      maxDiffPixelRatio: 0.05,
      mask: [
        modal.locator('input[type="date"], input[id="loanedAt"], input[id="returnedAt"]'),
      ],
    });
  });

  test('loan view modal showing book and user relations', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('loan');
    await list.waitForRows();
    // loan-1: Alice Smith / De Ruimteslee — first row sorted by loanedAt asc
    await list.clickView(0);

    const modal = page.getByTestId('form-modal');
    await modal.waitFor({ state: 'visible' });
    await expect(modal).toHaveScreenshot('loan-view-modal.png', {
      maxDiffPixelRatio: 0.05,
      mask: [
        modal.locator('input[type="date"], input[id="loanedAt"], input[id="returnedAt"]'),
      ],
    });
  });
});
