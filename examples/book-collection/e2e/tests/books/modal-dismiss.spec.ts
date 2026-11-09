import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

test.describe('Modal dismiss', () => {
  test('Escape key closes edit modal', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    await expect(page.getByTestId('form-modal')).toBeVisible();

    // Press Escape from within the modal body (not inside a dropdown)
    await page.getByTestId('form-modal').press('Escape');

    await expect(page.getByTestId('form-modal')).not.toBeVisible({ timeout: 3000 });
  });

  test('Escape key closes create modal', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.waitForRows();
    await list.clickCreate();
    await form.waitForModal();

    await expect(page.getByTestId('form-modal')).toBeVisible();

    await page.getByTestId('form-modal').press('Escape');

    await expect(page.getByTestId('form-modal')).not.toBeVisible({ timeout: 3000 });
  });

  test('Close button dismisses auto-save modal', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    await expect(page.getByTestId('form-modal')).toBeVisible();

    // In auto-save mode the Close button is shown (exclude the ✕ icon button via text filter)
    const closeBtn = page.getByTestId('form-modal').locator('button').filter({ hasText: /^Close$/ });
    await closeBtn.click();

    await expect(page.getByTestId('form-modal')).not.toBeVisible({ timeout: 3000 });
  });
});
