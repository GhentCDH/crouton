import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../../page-objects/CroutonListPage';

test.describe('Select control — availability field', () => {
  test.describe.configure({ mode: 'serial' });

  test('availability select shows options', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.search('De Ruimteslee');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    await modal.getByRole('combobox', { name: /availability/i }).click();
    await expect(page.getByRole('option', { name: /available/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /checked.?out/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /reserved/i })).toBeVisible();

    // Close dropdown by selecting current value (no-op), then cancel modal
    await page.getByRole('option', { name: /available/i }).click();
    await form.cancel();
  });

  test('availability can be changed and persists', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.search('De Nerveuze Neushoorn');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    await form.selectEnum(/availability/i, 'Checked out');
    await form.waitForAutoSave();

    // Verify
    await list.search('De Nerveuze Neushoorn');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    const availabilityCombo = modal.getByRole('combobox', { name: /availability/i });
    const selectedText = await availabilityCombo.inputValue().catch(() =>
      availabilityCombo.textContent().then(t => t?.trim() ?? '')
    );
    expect(selectedText.toLowerCase()).toContain('checked');

    // Reset
    await form.selectEnum(/availability/i, 'Available');
    await form.waitForAutoSave();
  });
});
