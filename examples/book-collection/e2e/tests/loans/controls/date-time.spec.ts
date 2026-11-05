import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../../page-objects/CroutonListPage';

test.describe('DateTime control — requestedPickupAt field', () => {
  test.describe.configure({ mode: 'serial' });

  test('requestedPickupAt renders as datetime-local input', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('loan');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    const input = modal.locator('#requestedPickupAt');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('type', 'datetime-local');

    await form.cancel();
  });

  test('requestedPickupAt accepts a datetime value and persists', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('loan');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    const input = modal.locator('#requestedPickupAt');
    await input.fill('2026-12-25T10:00');
    await page.keyboard.press('Tab');
    await form.waitForAutoSave();

    // Reopen and verify
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const reopenedInput = modal.locator('#requestedPickupAt');
    const val = await reopenedInput.inputValue();
    expect(val).toContain('2026-12-25');

    // Clear
    await reopenedInput.fill('');
    await page.keyboard.press('Tab');
    await form.waitForAutoSave();
  });

  test('requestedPickupAt can be cleared to null', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('loan');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    const input = modal.locator('#requestedPickupAt');

    // Set then clear
    await input.fill('2026-11-01T09:00');
    await page.keyboard.press('Tab');
    await form.waitForAutoSave();

    await input.fill('');
    await page.keyboard.press('Tab');
    await form.waitForAutoSave();

    const val = await input.inputValue();
    expect(val).toBe('');
  });
});
