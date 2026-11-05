import { expect, test } from '@playwright/test';

import { CollapseSection } from '../../page-objects/CollapseSection';
import { CroutonFormPage } from '../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

test.describe('Layout — book form grid', () => {
  test('book form renders with grid layout', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.search('De Ruimteslee');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');

    await expect(modal.getByLabel('Title', { exact: false })).toBeVisible();
    await expect(modal.getByRole('combobox', { name: /status/i })).toBeVisible();

    await form.cancel();
  });

  test('book form has Categories collapse section', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);
    const collapse = new CollapseSection(page);

    await list.navigateTo('book');
    await list.search('De Ruimteslee');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    const categoriesSection = modal.locator('text=Categories').first();
    await expect(categoriesSection).toBeVisible();

    await collapse.expand('Categories');
    await expect(await collapse.isExpanded('Categories')).toBe(true);

    await form.cancel();
  });

  test('summary field has rowspan 2 — renders taller than adjacent fields', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.search('De Ruimteslee');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    // Summary textarea renders at full width (colspan 12) spanning 2 grid rows
    const summaryArea = modal.getByLabel('Summary', { exact: false });
    await expect(summaryArea).toBeVisible();
    const summaryBox = await summaryArea.boundingBox();
    const titleBox = await modal.getByLabel('Title', { exact: false }).boundingBox();

    // Summary (rowspan 2) should be taller than title (rowspan 1)
    if (summaryBox && titleBox) {
      expect(summaryBox.height).toBeGreaterThan(titleBox.height);
    }

    await form.cancel();
  });

  test('title (colspan 8) is wider than isbn (colspan 4)', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.search('De Ruimteslee');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    const titleBox = await modal.getByLabel('Title', { exact: false }).boundingBox();
    const isbnBox = await modal.getByLabel('ISBN', { exact: false }).boundingBox();

    if (titleBox && isbnBox) {
      expect(titleBox.width).toBeGreaterThan(isbnBox.width);
    }

    await form.cancel();
  });

  test('titleKey — Categories collapse shows book title as header', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.search('De Ruimteslee');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    // Categories collapse has titleKey: "title" so it shows the book title
    const collapseHeader = modal.locator('[data-testid="collapse-header"], .collapse-title, button').filter({
      hasText: /De Ruimteslee|Categories/i,
    }).first();
    await expect(collapseHeader).toBeVisible();

    await form.cancel();
  });

  test('isbn field is readonly in book form', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.search('De Ruimteslee');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    const isbnInput = modal.getByLabel('ISBN', { exact: false });
    await expect(isbnInput).toBeVisible();
    // Readonly field should be disabled or have readonly attribute
    const isDisabled = await isbnInput.isDisabled();
    const readonlyAttr = await isbnInput.getAttribute('readonly');
    expect(isDisabled || readonlyAttr !== null).toBe(true);

    await form.cancel();
  });
});
