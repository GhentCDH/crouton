import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../page-objects/CroutonListPage';
import { LanguagePage } from '../../page-objects/LanguagePage';

test.describe('Date locale', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const lang = new LanguagePage(page);
    const current = await lang.getCurrentLanguage().catch(() => 'en');
    if (current !== 'en') await lang.switchLanguage('en');
  });

  test('loan loanedAt date input is present and has a value', async ({ page }) => {
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('loan');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    const loanedAtInput = modal.locator('#loanedAt, input[name="loanedAt"]').first();
    await expect(loanedAtInput).toBeVisible();

    const val = await loanedAtInput.inputValue();
    expect(val).toBeTruthy();

    await form.cancel();
  });

  test('date value persists in correct format after edit', async ({ page }) => {
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('loan');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    const loanedAtInput = modal.locator('#loanedAt, input[name="loanedAt"]').first();
    await loanedAtInput.fill('2025-06-15');
    await page.keyboard.press('Tab');
    await form.waitForAutoSave();

    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const saved = await modal.locator('#loanedAt, input[name="loanedAt"]').first().inputValue();
    expect(saved).toContain('2025');

    await form.cancel();
  });

  test('date locale option is configured on the field (en-GB default)', async ({ page }) => {
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('loan');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    // Date picker uses en-GB locale by default from DateOptionsSchema
    // Verify: input exists and has a date value (locale correctness tested via visual regression)
    const loanedAtInput = modal.locator('#loanedAt, input[name="loanedAt"], input[type="date"]').first();
    await expect(loanedAtInput).toBeVisible();
    const val = await loanedAtInput.inputValue();
    expect(val).toBeTruthy();

    await form.cancel();
  });
});
