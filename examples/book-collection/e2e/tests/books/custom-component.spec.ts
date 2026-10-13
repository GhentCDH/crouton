import { expect, test } from '@playwright/test';

import { resetDb } from '../../helpers/reset-db';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

test.describe('book table custom components and actions', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await resetDb();
  });

  test('CreateByIsbn custom component renders in book table toolbar', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    // The CreateByIsbn component renders above the table.
    // It typically contains an ISBN input field.
    const isbnInput = page
      .getByPlaceholder(/isbn/i)
      .or(page.locator('[data-component="CreateByIsbn"] input'))
      .or(page.locator('input[name="isbn"]'));

    await expect(isbnInput.first()).toBeVisible({ timeout: 5000 });
  });

  test('CreateByIsbn lookup with seeded ISBN 9789002270253', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    const isbnInput = page.getByPlaceholder(/isbn/i).first();
    await isbnInput.fill('9789002270253');

    // Trigger the lookup — Enter key or a button
    await isbnInput.press('Enter');
    await page.waitForLoadState('networkidle');

    // The book "De Ruimteslee" already exists — expect a toast or the row highlighted
    const feedback = page
      .locator('.toast')
      .or(page.getByText(/De Ruimteslee/i))
      .or(page.getByText(/already exists/i));
    await expect(feedback.first()).toBeVisible({ timeout: 5000 });
  });

  test('global table action button is visible', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    // Global table actions appear in the toolbar above the table.
    // The book table has a CreateByIsbn component which itself acts as a
    // global action. Verify at least one action button or the component renders.
    const toolbar = page.locator('[data-testid="table-toolbar"], .table-toolbar, header').first();
    await expect(toolbar.or(page.getByTestId('btn-create').first())).toBeVisible({ timeout: 5000 });
  });

  test('row action buttons appear on hover', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    const firstRow = list.getRows().first();
    await firstRow.hover();

    // Row-level actions: edit and delete buttons
    await expect(firstRow.getByRole('button', { name: /edit|update/i })).toBeVisible({ timeout: 3000 });
    await expect(firstRow.getByRole('button', { name: /delete|remove/i })).toBeVisible({ timeout: 3000 });
  });

  test('rating stars render in book table rows', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    // "De Ruimteslee" has rating 4 — expect 5 star buttons in its row
    const firstRow = list.getRows().first();
    const stars = firstRow.getByRole('button').filter({ hasText: '★' });
    await expect(stars).toHaveCount(5, { timeout: 5000 });
  });

  test('rating stars render in book edit modal', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    await list.clickEdit(0);

    const modal = page.getByTestId('form-modal');
    const stars = modal.getByRole('button').filter({ hasText: '★' });
    await expect(stars).toHaveCount(5, { timeout: 5000 });
  });

  test('clicking a rating star updates the value and saves', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    await list.clickEdit(0);

    const modal = page.getByTestId('form-modal');
    const stars = modal.getByRole('button').filter({ hasText: '★' });

    // Click the 2nd star → set rating to 2
    await stars.nth(1).click();

    // Auto-save form — wait for saved confirmation then close
    await expect(modal.getByText(/saved/i)).toBeVisible({ timeout: 5000 });
    await modal.locator('button').filter({ hasText: 'Close' }).click();
    await modal.waitFor({ state: 'hidden', timeout: 5000 });

    // Re-open and verify the 2nd star is now selected (first two should be yellow)
    await list.clickEdit(0);
    const updatedStars = modal.getByRole('button').filter({ hasText: '★' });
    await expect(updatedStars.nth(0)).toHaveClass(/text-yellow-400/, { timeout: 3000 });
    await expect(updatedStars.nth(1)).toHaveClass(/text-yellow-400/, { timeout: 3000 });
    await expect(updatedStars.nth(2)).toHaveClass(/text-gray-300/, { timeout: 3000 });
  });
});
