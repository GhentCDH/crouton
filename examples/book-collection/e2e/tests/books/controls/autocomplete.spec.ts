import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../../page-objects/CroutonListPage';

const BOOK = 'De Zwarte Madam';
const ORIGINAL_AUTHOR = 'Willy Vandersteen';

const openBook = async (list: CroutonListPage, form: CroutonFormPage) => {
  await list.navigateTo('book');
  await list.search(BOOK);
  await list.waitForRows();
  await list.clickEdit(0);
  await form.waitForModal();
};

test.describe('Autocomplete control — authorId field', () => {
  test.describe.configure({ mode: 'serial' });

  test('shows the hydrated label of the stored id', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);
    await openBook(list, form);

    const author = page.getByTestId('form-modal').getByRole('combobox', { name: 'authorId' });
    await expect(author).toHaveValue(ORIGINAL_AUTHOR);

    await form.cancel();
  });

  test('typing filters the remote options', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);
    await openBook(list, form);

    const author = page.getByTestId('form-modal').getByRole('combobox', { name: 'authorId' });
    await author.click();
    await author.fill('Tol');

    await expect(page.getByRole('option', { name: 'J.R.R. Tolkien' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Donald Knuth' })).toHaveCount(0);
    await page.keyboard.press('Escape');

    await form.cancel();
  });

  test('offers a create-new action', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);
    await openBook(list, form);

    const group = page.getByTestId('form-modal').getByRole('group', { name: /Author/ });
    await expect(group.getByRole('button', { name: 'create' })).toBeVisible();

    await form.cancel();
  });

  test('selecting an option persists and shows in table', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);
    await openBook(list, form);

    const author = page.getByTestId('form-modal').getByRole('combobox', { name: 'authorId' });
    await author.click();
    await author.fill('Knuth');
    await page.getByRole('option', { name: 'Donald Knuth' }).click();
    await expect(author).toHaveValue('Donald Knuth');
    await form.waitForAutoSave();

    await list.search(BOOK);
    await list.waitForRows();
    await expect(list.getRows().first()).toContainText('Donald Knuth');

    // Reset
    await list.clickEdit(0);
    await form.waitForModal();
    await author.click();
    await author.fill('Vandersteen');
    await page.getByRole('option', { name: ORIGINAL_AUTHOR }).click();
    await form.waitForAutoSave();
  });
});
