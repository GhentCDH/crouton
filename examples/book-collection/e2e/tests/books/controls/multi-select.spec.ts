import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../../page-objects/CroutonListPage';

test.describe('MultiSelect control — provenance field', () => {
  test.describe.configure({ mode: 'serial' });

  test('provenance multiselect renders in book form', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.search('De Ruimteslee');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    await expect(modal.getByRole('combobox', { name: /provenance/i })).toBeVisible();

    await form.cancel();
  });

  test('provenance shows all options when opened', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.search('De Ruimteslee');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    await modal.getByRole('combobox', { name: /provenance/i }).click();

    await expect(page.getByRole('option', { name: /gift/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /purchased/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /inherited/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /borrowed/i })).toBeVisible();

    await form.cancel();
  });

  test('can select multiple provenance values', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.search('De Vliegende Aap');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    const combo = modal.getByRole('combobox', { name: /provenance/i });

    await combo.click();
    await page.getByRole('option', { name: /gift/i }).click();
    await combo.click();
    await page.getByRole('option', { name: /purchased/i }).click();
    await page.keyboard.press('Tab');

    // Check display before auto-save closes the modal
    const displayText = await combo.textContent();
    expect(displayText).toMatch(/gift|purchased/i);

    await form.waitForAutoSave();

    // Reopen to reset (waitForAutoSave closes the modal)
    await list.search('De Vliegende Aap');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    // Reset by clearing — open and deselect
    await combo.click();
    const selectedGift = page.getByRole('option', { name: /gift/i });
    if (await selectedGift.isVisible()) await selectedGift.click();
    await combo.click();
    const selectedPurchased = page.getByRole('option', { name: /purchased/i });
    if (await selectedPurchased.isVisible()) await selectedPurchased.click();
    await page.keyboard.press('Tab');
    await form.waitForAutoSave();
  });
});
