import { expect, test } from '@playwright/test';

import { CollapseSection } from '../../page-objects/CollapseSection';
import { CroutonFormPage } from '../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

test.describe('Layout — book form grid', () => {
  test('book form renders with grid layout', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.search('De Ruimteslee');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');

    // Title field should be visible and in the form
    await expect(modal.getByLabel('Title', { exact: false })).toBeVisible();

    // Status field should be visible
    await expect(modal.getByRole('combobox', { name: /status/i })).toBeVisible();

    await form.cancel();
  });

  test('book form has Categories collapse section', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);
    const collapse = new CollapseSection(page);

    await list.navigateTo('book');
    await list.search('De Ruimteslee');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    // Categories collapse section exists
    const modal = page.getByTestId('form-modal');
    const categoriesSection = modal.locator('text=Categories').first();
    await expect(categoriesSection).toBeVisible();

    // Expand and verify content is accessible
    await collapse.expand('Categories');
    await expect(await collapse.isExpanded('Categories')).toBe(true);

    await form.cancel();
  });
});
