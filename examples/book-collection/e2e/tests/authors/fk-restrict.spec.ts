import { expect, test } from '@playwright/test';

import { CroutonListPage } from '../../page-objects/CroutonListPage';

test.describe('FK restrict — author delete with books', () => {
  test('deleting an author with books shows error notification', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('author');
    await list.waitForRows();

    // Intercept the delete request and simulate a FK constraint error (409 Conflict)
    await page.route('**/author/*', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Cannot delete author with associated books' }),
        });
      } else {
        route.continue();
      }
    });

    const rowCountBefore = await list.getRowCount();

    await list.clickDelete(0);
    await page.getByRole('button', { name: 'Ok', exact: true }).click();

    // Error notification should appear
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.alert-error')).toBeVisible({ timeout: 5000 });

    // Row count should be unchanged
    const rowCountAfter = await list.getRowCount();
    expect(rowCountAfter).toBe(rowCountBefore);
  });

  test('cancelling delete dialog leaves author intact', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('author');
    await list.waitForRows();

    const rowCountBefore = await list.getRowCount();

    await list.clickDelete(0);
    // Cancel instead of confirming
    await page.getByRole('button', { name: 'Cancel' }).click();

    const rowCountAfter = await list.getRowCount();
    expect(rowCountAfter).toBe(rowCountBefore);
  });
});
