import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../../page-objects/CroutonListPage';

test.describe('Custom control — rating field', () => {
  test.describe.configure({ mode: 'serial' });

  test('rating control is visible in edit form', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.search('De Ruimteslee');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    // Rating custom component should be present in the modal
    const modal = page.getByTestId('form-modal');
    const ratingEl = modal.locator('[data-testid="rating-stars"]');
    await expect(ratingEl).toBeVisible({ timeout: 5000 });

    await form.cancel();
  });

  test('rating value is shown in table', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);

    await list.navigateTo('book');
    await list.waitForRows();

    // Table renders rating column
    const headers = page.getByRole('columnheader');
    const ratingHeader = headers.filter({ hasText: /rating/i });
    await expect(ratingHeader).toBeVisible();
  });
});
