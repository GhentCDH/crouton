import { expect, test } from '@playwright/test';

import { resetDb } from '../../helpers/reset-db';
import { CroutonFormPage } from '../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

// Regression for #468: a relation change re-fetches the record. Text typed
// just before (within the autosave debounce) must survive the refresh and be saved.
test.describe('relation refresh keeps unsaved edits', () => {
  test.beforeAll(async () => {
    await resetDb();
  });

  test('typed title survives adding a category', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.waitForRows();
    await list.search('De Vliegende Aap');
    await page.waitForTimeout(400);
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    const title = modal.getByRole('textbox', { name: /^Title/ });
    const newTitle = 'De Vliegende Aap (2e druk)';

    const titleSaved = page.waitForResponse(
      (r) =>
        r.request().method() === 'PATCH' &&
        (r.request().postData() ?? '').includes('2e druk'),
    );

    // Type, then change a relation before the 800 ms autosave debounce fires.
    await title.fill(newTitle);

    await form.expandCollapse('Categories');
    const chipList = modal.locator('[data-testid="relation-chip-list"]');
    await chipList.waitFor({ state: 'visible' });
    const countBefore = await chipList.getByRole('button').count();

    const addSection = modal.locator('[data-testid="relation-inline-add"]');
    await addSection.getByRole('combobox').click();
    await page.getByRole('option', { name: /Science Fiction/i }).click();
    await addSection.getByRole('button', { name: /add/i }).click();

    // After the refresh both the relation and the typed text are present…
    await expect(chipList.getByRole('button')).toHaveCount(countBefore + 1);
    await expect(title).toHaveValue(newTitle);

    // …and the typed text is persisted.
    await titleSaved;
    await form.cancel();

    await list.search('2e druk');
    await page.waitForTimeout(400);
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();
    await expect(title).toHaveValue(newTitle);
  });
});
