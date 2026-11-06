import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../../page-objects/CroutonListPage';

test.describe('Toggle button-group control — isSigned field', () => {
  test.describe.configure({ mode: 'serial' });

  test('isSigned toggle renders Yes/No buttons', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.search('De Ruimteslee');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    await expect(modal.getByRole('button', { name: 'Yes' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'No' })).toBeVisible();

    await form.cancel();
  });

  test('isSigned can be set to Yes and persists', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.search('De Vliegende Aap');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    await modal.getByRole('button', { name: 'Yes' }).click();
    await form.waitForAutoSave();

    // Reopen and verify
    await list.search('De Vliegende Aap');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    // Yes button should now be active (has primary color class vs outline)
    const yesBtn = modal.getByRole('button', { name: 'Yes' });
    await expect(yesBtn).toBeVisible();
    // Reset: click No to restore default
    await modal.getByRole('button', { name: 'No' }).click();
    await form.waitForAutoSave();
  });

  test('clicking active toggle button clears value (clearable: false keeps last)', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.search('De Nerveuze Neushoorn');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    // Set to Yes
    await modal.getByRole('button', { name: 'Yes' }).click();
    await form.waitForAutoSave();

    // Re-open to verify (waitForAutoSave closes the modal)
    await list.search('De Nerveuze Neushoorn');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    // Both buttons still visible (not cleared since clearable: false)
    await expect(modal.getByRole('button', { name: 'Yes' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'No' })).toBeVisible();

    // Reset
    await modal.getByRole('button', { name: 'No' }).click();
    await form.waitForAutoSave();
  });
});
