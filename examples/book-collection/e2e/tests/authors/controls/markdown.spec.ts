import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../../page-objects/CroutonListPage';

test.describe('Markdown control — notes field', () => {
  test.describe.configure({ mode: 'serial' });

  test('notes markdown editor is present in author form', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('author');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    // TipTap renders the field as role="textbox" with aria-label matching the field id/label
    const editor = modal.getByRole('textbox', { name: /notes/i }).first();
    await expect(editor).toBeVisible({ timeout: 5000 });

    await form.cancel();
  });

  test('notes content can be saved', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('author');
    await list.search('Vandersteen');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    // The outer textbox is the TipTap wrapper; the inner textbox is the editable surface
    const outer = modal.getByRole('textbox', { name: /notes/i }).first();
    const inner = outer.getByRole('textbox').first();
    await inner.click();
    await inner.fill('Author notes content');
    await form.waitForAutoSave();

    // Re-open and verify content persisted
    await list.search('Vandersteen');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const editorContent = await modal.getByRole('textbox', { name: /notes/i }).first().textContent();
    expect(editorContent?.trim()).toBeTruthy();
    await form.cancel();
  });
});
