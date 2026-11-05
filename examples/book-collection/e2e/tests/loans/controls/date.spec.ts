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

    const loanedAtVal = await form.getFieldValue('Loaned At');
    expect(loanedAtVal).toBeTruthy();

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

    await form.fillDatePicker('Loaned At', '2024-03-15');
    await form.waitForAutoSave();

    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const saved = await form.getFieldValue('Loaned At');
    expect(saved).toContain('2024');
    await form.cancel();
  });

  test('returnedAt is nullable and can be cleared', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('loan');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    // Set a returnedAt date
    await form.fillDatePicker('Returned At', '2024-04-01');
    await form.waitForAutoSave();

    // Now clear it
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const returnedAtInput = page.getByLabel('Returned At', { exact: false }).first();
    await returnedAtInput.clear();
    await page.keyboard.press('Tab');
    await form.waitForAutoSave();

    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();
    const val = await form.getFieldValue('Returned At');
    expect(val).toBeFalsy();
    await form.cancel();
  });
});
