import { expect, test } from '@playwright/test';

import { CroutonListPage } from '../../page-objects/CroutonListPage';
import { LanguagePage } from '../../page-objects/LanguagePage';

test.describe('language switch', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Reset to EN before each test
    const lang = new LanguagePage(page);
    const current = await lang.getCurrentLanguage().catch(() => 'en');
    if (current !== 'en') await lang.switchLanguage('en');
  });

  test('app boots in English by default', async ({ page }) => {
    const lang = new LanguagePage(page);
    const current = await lang.getCurrentLanguage();
    expect(current).toBe('en');
  });

  test('language select is visible in sidebar', async ({ page }) => {
    await expect(page.locator('#drawer-left-panel .dropdown [role="button"]')).toBeVisible();
  });

  test('sidebar labels change to Dutch after switching to NL', async ({ page }) => {
    const list = new CroutonListPage(page);
    await list.navigateTo('book');

    const lang = new LanguagePage(page);
    await lang.switchLanguage('nl');

    const bookLabel = await lang.getNavLabel('book');
    expect(bookLabel).toBe('Boeken');
  });

  test('table column headers change to Dutch', async ({ page }) => {
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    const lang = new LanguagePage(page);
    await lang.switchLanguage('nl');

    await expect(page.getByRole('columnheader', { name: 'Titel' })).toBeVisible();
  });

  test('enum display values change to Dutch', async ({ page }) => {
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    const lang = new LanguagePage(page);
    await lang.switchLanguage('nl');

    await expect(page.getByText('Gepubliceerd').first()).toBeVisible();
  });

  test('all 3 enum values translate: Concept, Gepubliceerd, Gearchiveerd', async ({ page }) => {
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    const lang = new LanguagePage(page);
    await lang.switchLanguage('nl');

    // At least one of each should appear in the table (seed has draft/published/archived)
    await expect(page.getByText('Concept').first()).toBeVisible();
    await expect(page.getByText('Gepubliceerd').first()).toBeVisible();
    await expect(page.getByText('Gearchiveerd').first()).toBeVisible();
  });

  test('switching back to EN restores English column headers', async ({ page }) => {
    const list = new CroutonListPage(page);
    await list.navigateTo('book');
    await list.waitForRows();

    const lang = new LanguagePage(page);
    await lang.switchLanguage('nl');
    await expect(page.getByRole('columnheader', { name: 'Titel' })).toBeVisible();

    await lang.switchLanguage('en');
    await expect(page.getByRole('columnheader', { name: 'Title' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Titel' })).not.toBeVisible();
  });

  test('multiple nav labels change to Dutch', async ({ page }) => {
    const lang = new LanguagePage(page);
    await lang.switchLanguage('nl');

    await expect(page.getByTestId('nav-author')).toHaveText('Auteurs');
    await expect(page.getByTestId('nav-user')).toHaveText('Gebruikers');
  });
});
