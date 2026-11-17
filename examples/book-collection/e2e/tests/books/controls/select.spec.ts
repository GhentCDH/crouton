import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../../page-objects/CroutonListPage';

const BOOK = 'De Zwarte Madam';

const openBook = async (list: CroutonListPage, form: CroutonFormPage) => {
  await list.navigateTo('book');
  await list.search(BOOK);
  await list.waitForRows();
  await list.clickEdit(0);
  await form.waitForModal();
};

test.describe('Select control — status (enum) and availability (static options)', () => {
  test.describe.configure({ mode: 'serial' });

  test('status lists all enum options', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);
    await openBook(list, form);

    const modal = page.getByTestId('form-modal');
    const status = modal.getByRole('combobox', { name: 'status' });
    await expect(status).toHaveText('Draft');

    await status.click();
    for (const label of ['Draft', 'Published', 'Archived']) {
      await expect(page.getByRole('option', { name: label, exact: true })).toBeVisible();
    }
    await page.keyboard.press('Escape');

    await form.cancel();
  });

  test('status is not clearable (clearable: false)', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);
    await openBook(list, form);

    const group = page.getByTestId('form-modal').getByRole('group', { name: /Status/ });
    await expect(group.getByRole('button', { name: /clear/i })).toHaveCount(0);

    await form.cancel();
  });

  test('changing status persists and shows in table', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);
    await openBook(list, form);

    const status = page.getByTestId('form-modal').getByRole('combobox', { name: 'status' });
    await status.click();
    await page.getByRole('option', { name: 'Published', exact: true }).click();
    await expect(status).toHaveText('Published');
    await form.waitForAutoSave();

    await list.search(BOOK);
    await list.waitForRows();
    await expect(list.getRows().first()).toContainText('Published');

    // Reset
    await list.clickEdit(0);
    await form.waitForModal();
    await status.click();
    await page.getByRole('option', { name: 'Draft', exact: true }).click();
    await form.waitForAutoSave();
  });

  test('changing availability persists after reopen', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);
    await openBook(list, form);

    const availability = page.getByTestId('form-modal').getByRole('combobox', { name: 'availability' });
    await expect(availability).toHaveText('Available');

    await availability.click();
    await page.getByRole('option', { name: 'Reserved', exact: true }).click();
    await form.waitForAutoSave();

    await list.search(BOOK);
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();
    await expect(availability).toHaveText('Reserved');

    // Reset
    await availability.click();
    await page.getByRole('option', { name: 'Available', exact: true }).click();
    await form.waitForAutoSave();
  });
});
