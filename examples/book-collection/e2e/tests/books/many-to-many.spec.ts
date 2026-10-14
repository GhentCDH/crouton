import { expect, test } from '@playwright/test';

import { resetDb } from '../../helpers/reset-db';
import { CroutonFormPage } from '../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

test.describe('manyToMany relation', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await resetDb();
  });

  test('book edit form shows categories relation editor', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.waitForRows();

    await list.search('De Vliegende Aap');
    await page.waitForTimeout(400);
    await list.waitForRows();
    await list.clickEdit(0);

    await expect(page.getByTestId('form-modal')).toBeVisible();
    await expect(page.getByText(/categories/i).first()).toBeVisible();

    await form.cancel();
  });

  test('add a category to a book via collapse section', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    // Use a book that currently has only one category (De Vliegende Aap = Fiction only)
    await list.navigateTo('book');
    await list.waitForRows();
    await list.search('De Vliegende Aap');
    await page.waitForTimeout(400);
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    // Expand the Categories collapse section
    await form.expandCollapse('Categories');

    // Count chips before
    const modal = page.getByTestId('form-modal');
    const chipList = modal.locator('[data-testid="relation-chip-list"]');
    await chipList.waitFor({ state: 'visible' });
    const countBefore = await chipList.getByRole('button').count();

    // Click the autocomplete in the relation-inline-add section
    const addSection = modal.locator('[data-testid="relation-inline-add"]');
    await addSection.getByRole('combobox').click();
    await page.waitForTimeout(300);

    // Pick "Science Fiction" from the dropdown options
    await page.getByRole('option', { name: /Science Fiction/i }).click();
    await page.waitForTimeout(200);

    // Click the "Add" button to link the category
    await addSection.getByRole('button', { name: /add/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);

    const countAfter = await chipList.getByRole('button').count();
    expect(countAfter).toBeGreaterThan(countBefore);

    await form.cancel();
  });

  test('remove a category from a book', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    // Use a book with two categories (De Ruimteslee = two categories)
    await list.navigateTo('book');
    await list.waitForRows();
    await list.search('De Ruimteslee');
    await page.waitForTimeout(400);
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    await form.expandCollapse('Categories');

    const modal = page.getByTestId('form-modal');
    const chipList = modal.locator('[data-testid="relation-chip-list"]');
    await chipList.waitFor({ state: 'visible' });
    const countBefore = await chipList.getByRole('button').count();

    if (countBefore === 0) {
      // No categories to remove — skip
      await form.cancel();
      return;
    }

    // Click the delete icon on the first chip
    const firstChip = chipList.getByRole('button').first();
    await firstChip.locator('[data-testid="relation-chip-delete"]').click();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);

    const countAfter = await chipList.getByRole('button').count();
    expect(countAfter).toBeLessThan(countBefore);

    await form.cancel();
  });
});
