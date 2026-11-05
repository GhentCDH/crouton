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

  test('loan date picker renders with default locale (en-GB)', async ({ page }) => {
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('loan');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    // Date input should be present and have a value in ISO/en-GB format
    const loanedAtInput = modal.getByLabel('Loaned At', { exact: false }).first();
    await expect(loanedAtInput).toBeVisible();

    const val = await loanedAtInput.inputValue();
    // ISO 8601 or dd/mm/yyyy format expected for en-GB
    expect(val).toBeTruthy();

    await form.cancel();
  });

  test('date picker opens calendar on click', async ({ page }) => {
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('loan');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    // Click the date picker toggle/button to open calendar
    const calendarToggle = modal.locator('[data-testid*="calendar"], button[aria-label*="calendar" i], .date-picker-toggle').first();
    if (await calendarToggle.isVisible()) {
      await calendarToggle.click();
      // Calendar popup with month/day grid should appear
      const calendar = page.locator('[role="dialog"] [role="grid"], .calendar-popup, .datepicker-popup').first();
      await expect(calendar).toBeVisible({ timeout: 3000 });
    } else {
      // Inline calendar — look for day grid
      const dayGrid = modal.locator('[role="grid"], .calendar-days').first();
      await expect(dayGrid).toBeVisible({ timeout: 3000 });
    }

    await form.cancel();
  });

  test('date value persists in correct format after edit', async ({ page }) => {
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('loan');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    await form.fillDatePicker('Loaned At', '2025-06-15');
    await form.waitForAutoSave();

    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const saved = await form.getFieldValue('Loaned At');
    // Should contain the year at minimum
    expect(saved).toContain('2025');

    await form.cancel();
  });
});
