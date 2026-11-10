import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

// Regression for #468: Escape that closes a date picker must not also close
// the surrounding edit modal.
test.describe('Escape inside date picker', () => {
  test('closes only the picker, then the modal on a second Escape', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('loan');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    const picker = modal.locator('.dropdown-content[role="dialog"]');

    await modal.locator('#loanedAt, input[name="loanedAt"]').first().click();
    await expect(picker).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(picker).toBeHidden();
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden({ timeout: 3000 });
  });
});
