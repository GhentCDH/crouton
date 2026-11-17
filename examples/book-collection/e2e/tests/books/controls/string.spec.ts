import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../../page-objects/CroutonListPage';

const BOOK = 'De Zwarte Madam';
const RENAMED = 'De Zwarte Madam (e2e)';

test.describe('String control — title field', () => {
  test.describe.configure({ mode: 'serial' });

  test('title shows the current value', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.search(BOOK);
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    await expect(modal.getByRole('textbox', { name: 'Title' })).toHaveValue(BOOK);

    await form.cancel();
  });

  test('clearing a required title shows a validation error', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.search(BOOK);
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    await modal.getByRole('textbox', { name: 'Title' }).clear();
    await page.keyboard.press('Tab');

    await expect(modal.getByRole('group', { name: /Title/ })).toContainText('This field is required');
    await expect(page.getByText('Saved ✓')).toBeHidden();

    await form.cancel();

    // Invalid value was never saved
    await list.search(BOOK);
    await list.waitForRows();
    await expect(list.getRows().first()).toContainText(BOOK);
  });

  test('editing title persists and shows in table', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.search(BOOK);
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    const title = modal.getByRole('textbox', { name: 'Title' });
    await title.fill(RENAMED);
    await page.keyboard.press('Tab');
    await form.waitForAutoSave();

    await list.search(RENAMED);
    await list.waitForRows();
    await expect(list.getRows().first()).toContainText(RENAMED);

    // Reset
    await list.clickEdit(0);
    await form.waitForModal();
    await title.fill(BOOK);
    await page.keyboard.press('Tab');
    await form.waitForAutoSave();
  });
});
