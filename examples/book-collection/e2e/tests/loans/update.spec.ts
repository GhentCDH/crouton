import { expect, test } from '@playwright/test';

import { resetDb } from '../../helpers/reset-db';
import { CroutonFormPage } from '../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

test.describe('loans update', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await resetDb();
  });

  test('set returnedAt on loan that has none', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('loan');
    await list.waitForRows();

    // loan-2 (De Nerveuze Neushoorn / Bob Jones) is row index 1 sorted by loanedAt asc
    // Loans has no searchable columns — use row index directly
    await list.clickEdit(1);
    await form.waitForModal();

    // Fill returnedAt date input directly
    const savePromise = page.waitForResponse(
      (r) => r.url().includes('/loan') && r.request().method() === 'PATCH',
    );
    await page.locator('input#returnedAt').fill('2024-12-01');
    await page.keyboard.press('Tab');
    await savePromise;
    await form.waitForAutoSave();

    // Verify the date appears in that row
    await list.waitForRows();
    const row = list.getRows().nth(1);
    await expect(row).toContainText('2024-12-01');
  });

  test('clear returnedAt back to null', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('loan');
    await list.waitForRows();

    await list.clickEdit(1);
    await form.waitForModal();

    // Open the custom date picker popover and click Clear
    await page.locator('input#returnedAt').click();
    // Wait for the Clear button to appear before setting up the response listener
    await page.getByTestId('form-modal').getByRole('button', { name: 'Clear' }).waitFor();
    const savePromise = page.waitForResponse(async (r) => {
      if (!r.url().includes('/loan') || r.request().method() !== 'PATCH') return false;
      try {
        return r.request().postDataJSON()?.returnedAt === null;
      } catch {
        return false;
      }
    });
    await page.getByTestId('form-modal').getByRole('button', { name: 'Clear' }).click();
    await savePromise;
    await form.waitForAutoSave();

    // Row should no longer contain the date we set
    await list.waitForRows();
    const row = list.getRows().nth(1);
    await expect(row).not.toContainText('2024-12-01');
  });
});
