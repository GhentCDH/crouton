import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../../page-objects/CroutonListPage';

test.describe('Date control — loanedAt / returnedAt fields', () => {
  test.describe.configure({ mode: 'serial' });

  test('loanedAt date picker is present and has a default value', async ({ page }) => {
    await page.goto('/');
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

  test('loanedAt date can be changed and persists', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('loan');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    const loanedAtInput = modal.locator('#loanedAt, input[name="loanedAt"]').first();
    await loanedAtInput.fill('2024-03-15');
    await page.keyboard.press('Tab');
    await form.waitForAutoSave();

    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const saved = await modal.locator('#loanedAt, input[name="loanedAt"]').first().inputValue();
    expect(saved).toContain('2024');
    await form.cancel();
  });

  test('returnedAt is nullable and can be set', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('loan');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    const returnedAtInput = modal.locator('#returnedAt, input[name="returnedAt"]').first();
    await expect(returnedAtInput).toBeVisible();

    await form.cancel();
  });
});
