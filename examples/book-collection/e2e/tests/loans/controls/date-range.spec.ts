import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../../page-objects/CroutonListPage';

test.describe('Date-range control — rentalPeriod field', () => {
  test.describe.configure({ mode: 'serial' });

  test('rentalPeriod renders two date inputs (From / To)', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('loan');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    // Date-range renders two <input type="date"> inside the control
    const fromInput = modal.getByLabel('From');
    const toInput = modal.getByLabel('To');
    await expect(fromInput).toBeVisible();
    await expect(toInput).toBeVisible();

    await form.cancel();
  });

  test('from date cannot exceed to date (max constraint)', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('loan');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    const toInput = modal.getByLabel('To');
    const fromInput = modal.getByLabel('From');

    // Set To date — max on From updates reactively, no save needed
    await toInput.fill('2026-12-31');
    await page.keyboard.press('Tab');
    await expect(fromInput).toHaveAttribute('max', '2026-12-31');


    await form.cancel();
  });

  test('rentalPeriod from/to values persist', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('loan');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    const fromInput = modal.getByLabel('From');
    const toInput = modal.getByLabel('To');

    await fromInput.fill('2026-11-01');
    await page.keyboard.press('Tab');
    await toInput.fill('2026-11-30');
    await page.keyboard.press('Tab');
    await form.waitForAutoSave();

    // Reopen and verify
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const fromVal = await modal.getByLabel('From').inputValue();
    const toVal = await modal.getByLabel('To').inputValue();
    expect(fromVal).toBe('2026-11-01');
    expect(toVal).toBe('2026-11-30');

    // Reset
    await modal.getByLabel('From').fill('');
    await page.keyboard.press('Tab');
    await modal.getByLabel('To').fill('');
    await page.keyboard.press('Tab');
    await form.waitForAutoSave();
  });
});
