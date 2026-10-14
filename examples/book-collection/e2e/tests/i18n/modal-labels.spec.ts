import { expect, test } from '@playwright/test';

import { CroutonListPage } from '../../page-objects/CroutonListPage';
import { LanguagePage } from '../../page-objects/LanguagePage';

test.describe('i18n modal labels', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    // Close any open modal before resetting language
    const modal = page.getByTestId('form-modal');
    if (await modal.isVisible()) {
      await page.keyboard.press('Escape');
      await modal.waitFor({ state: 'hidden' });
    }
    const lang = new LanguagePage(page);
    await lang.switchLanguage('en').catch(() => undefined);
  });

  test.describe('edit modal — field labels', () => {
    test('book edit modal shows Dutch field label "Titel" in NL', async ({ page }) => {
      const list = new CroutonListPage(page);
      const lang = new LanguagePage(page);

      await list.navigateTo('book');
      await list.waitForRows();

      await lang.switchLanguage('nl');

      await list.clickEdit(0);

      // Form field label "Title" → "Titel" in NL
      await expect(page.getByLabel('Titel', { exact: false })).toBeVisible({ timeout: 5000 });
    });

    test('book edit modal title contains Dutch resource name', async ({ page }) => {
      const list = new CroutonListPage(page);
      const lang = new LanguagePage(page);

      await list.navigateTo('book');
      await list.waitForRows();

      await lang.switchLanguage('nl');

      await list.clickEdit(0);

      // Modal h3 title: "Update Boeken" (prefix hardcoded, resource title translated)
      const modalHeading = page.getByTestId('form-modal').locator('h3');
      await expect(modalHeading).toContainText('Boeken', { timeout: 5000 });
    });

    test('book edit modal shows English field labels by default', async ({ page }) => {
      const list = new CroutonListPage(page);

      await list.navigateTo('book');
      await list.waitForRows();

      await list.clickEdit(0);

      await expect(page.getByLabel('Title', { exact: false })).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('create modal — field labels', () => {
    test('book create modal shows Dutch field labels in NL', async ({ page }) => {
      const list = new CroutonListPage(page);
      const lang = new LanguagePage(page);

      await list.navigateTo('book');
      await list.waitForRows();

      await lang.switchLanguage('nl');

      await list.clickCreate();

      await expect(page.getByLabel('Titel', { exact: false })).toBeVisible({ timeout: 5000 });
    });

    test('book create modal title contains Dutch resource name', async ({ page }) => {
      const list = new CroutonListPage(page);
      const lang = new LanguagePage(page);

      await list.navigateTo('book');
      await list.waitForRows();

      await lang.switchLanguage('nl');

      await list.clickCreate();

      const modalHeading = page.getByTestId('form-modal').locator('h3');
      await expect(modalHeading).toContainText('Boeken', { timeout: 5000 });
    });
  });

  test.describe('view modal — field labels', () => {
    test('book view modal shows Dutch field labels in NL', async ({ page }) => {
      const list = new CroutonListPage(page);
      const lang = new LanguagePage(page);

      await list.navigateTo('book');
      await list.waitForRows();

      await lang.switchLanguage('nl');

      // clickView opens the read-only view modal
      await list.clickView(0);

      await expect(page.getByTestId('form-modal').locator('h3')).toContainText('Boeken', { timeout: 5000 });
    });
  });

  test.describe('table header labels', () => {
    test('book table shows "Titel" column header in NL', async ({ page }) => {
      const list = new CroutonListPage(page);
      const lang = new LanguagePage(page);

      await list.navigateTo('book');
      await list.waitForRows();

      await lang.switchLanguage('nl');

      await expect(page.getByRole('columnheader', { name: 'Titel' })).toBeVisible();
    });

    test('book table shows "Status" column header in NL', async ({ page }) => {
      const list = new CroutonListPage(page);
      const lang = new LanguagePage(page);

      await list.navigateTo('book');
      await list.waitForRows();

      await lang.switchLanguage('nl');

      await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    });

    test('book toolbar title shows "Boeken" in NL', async ({ page }) => {
      const list = new CroutonListPage(page);
      const lang = new LanguagePage(page);

      await list.navigateTo('book');
      await list.waitForRows();

      await lang.switchLanguage('nl');

      // Toolbar title span: {{ config.title }}
      await expect(page.getByText('Boeken').first()).toBeVisible();
    });

    test('loan table column "Uitgeleend op" visible in NL', async ({ page }) => {
      const list = new CroutonListPage(page);
      const lang = new LanguagePage(page);

      await list.navigateTo('loan');
      await list.waitForRows();

      await lang.switchLanguage('nl');

      await expect(page.getByRole('columnheader', { name: 'Uitgeleend op' })).toBeVisible();
    });
  });
});
