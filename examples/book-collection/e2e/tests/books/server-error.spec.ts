import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

test.describe('Server error handling', () => {
  test('500 on save shows error notification', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.waitForRows();

    // Intercept PATCH/PUT to simulate server 500
    await page.route('**/book/*', (route) => {
      if (['PATCH', 'PUT'].includes(route.request().method())) {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal server error' }),
        });
      } else {
        route.continue();
      }
    });

    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    const titleInput = modal.getByLabel('Title', { exact: false });
    await titleInput.fill('trigger error');
    await page.keyboard.press('Tab');

    // Wait for error notification
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.alert-error')).toBeVisible({ timeout: 5000 });
  });

  test('400 on delete shows error notification', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    await page.route('**/book/*', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Bad request' }),
        });
      } else {
        route.continue();
      }
    });

    await list.clickDelete(0);
    await page.getByRole('button', { name: 'Ok', exact: true }).click();

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.alert-error')).toBeVisible({ timeout: 5000 });
  });
});
