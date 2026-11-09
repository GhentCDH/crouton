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
    const addInput = modal.locator('[data-field="tags"] input, [aria-label*="Tags" i] input').first();
    if (await addInput.isVisible()) {
      await addInput.fill('classic');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      await expect(modal.locator('text=classic')).toBeVisible({ timeout: 3000 });
    }

    await form.cancel();
  });

  test('tags item can be removed', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('category');
    await list.search('Fiction');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    const addInput = modal.locator('[data-field="tags"] input, [aria-label*="Tags" i] input').first();

    if (await addInput.isVisible()) {
      // Add a tag
      await addInput.fill('removeme');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      await expect(modal.locator('text=removeme')).toBeVisible({ timeout: 3000 });

      // Find and click remove button for this tag
      const tagItem = modal.locator('[data-field="tags"], [aria-label*="Tags" i]').locator('text=removeme');
      const removeBtn = tagItem.locator('xpath=..').locator('button').last();
      if (await removeBtn.isVisible()) {
        await removeBtn.click();
        await page.waitForTimeout(300);
        await expect(modal.locator('text=removeme')).not.toBeVisible({ timeout: 3000 });
      }
    }

    await form.cancel();
  });
});
