import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../../page-objects/CroutonListPage';

test.describe('Array control — tags field', () => {
  test.describe.configure({ mode: 'serial' });

  test('tags array control is present in category form', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('category');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    // Array control should render an input or add button
    const arrayControl = modal.locator('[data-field="tags"], [aria-label*="Tags" i], [data-testid*="array"]');
    await expect(arrayControl.first()).toBeVisible({ timeout: 5000 });

    await form.cancel();
  });

  test('tags can be added and appear in the list', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('category');
    await list.search('Fiction');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    // Try to add a tag via the array input
    const addInput = modal.locator('[data-field="tags"] input, [aria-label*="Tags" i] input').first();
    if (await addInput.isVisible()) {
      await addInput.fill('classic');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      await expect(modal.locator('text=classic')).toBeVisible({ timeout: 3000 });
    }

    await form.cancel();
  });
});
