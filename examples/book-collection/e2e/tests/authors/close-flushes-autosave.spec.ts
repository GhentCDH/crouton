import { expect, test } from '@playwright/test';

import { resetDb } from '../../helpers/reset-db';
import { CroutonFormPage } from '../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

// Regression for #468: closing the modal within the autosave debounce must
// still persist the last edit.
test.describe('Close flushes pending autosave', () => {
  test.beforeAll(async () => {
    await resetDb();
  });

  test('bio typed right before Close is saved', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('author');
    await list.waitForRows();
    await list.search('J.R.R. Tolkien');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    // No Tab / no wait for "Saved ✓": close immediately, inside the 800 ms debounce.
    await form.fillField('Bio', 'Closed before debounce fired.');
    await page
      .getByTestId('form-modal')
      .locator('button')
      .filter({ hasText: /^Close$/ })
      .click();
    await page.getByTestId('form-modal').waitFor({ state: 'hidden' });
    await page.waitForLoadState('networkidle');

    await list.search('J.R.R. Tolkien');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();
    expect(await form.getFieldValue('Bio')).toContain('Closed before debounce fired.');
  });
});
