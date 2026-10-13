import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../page-objects/CroutonListPage';
import { LanguagePage } from '../../page-objects/LanguagePage';

test.describe('i18n validation errors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const lang = new LanguagePage(page);
    await lang.switchLanguage('nl');
  });

  test.afterEach(async ({ page }) => {
    // Reset language so other tests are not affected
    const lang = new LanguagePage(page);
    await lang.switchLanguage('en').catch(() => undefined);
  });

  test('missing required field shows Dutch error', async ({ page }) => {
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('user');
    await list.waitForRows();

    await list.clickCreate();
    await form.waitForModal();

    // Leave Name empty, fill only email to trigger required error on Name
    await form.fillField('E-mail', 'test-nl-required@example.com');
    await page.getByTestId('btn-save').click();

    // Expect Dutch validation message (inline or toast)
    await expect(
      page.getByText(/verplicht/i).or(page.getByText(/vereist/i)),
    ).toBeVisible({ timeout: 5000 });

    await form.cancel();
  });

  test('duplicate email shows Dutch unique-error toast', async ({ page }) => {
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('user');
    await list.waitForRows();

    await list.clickCreate();
    await form.waitForModal();

    // alice@example.com is seeded — must fail with unique constraint
    await form.fillField('Naam', 'Dubbele Alice');
    await form.fillField('E-mail', 'alice@example.com');
    await page.getByTestId('btn-save').click();

    await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.toast')).toContainText(/al bestaat|uniek|reeds/i);

    await expect(page.getByTestId('form-modal')).toBeVisible();
  });
});
