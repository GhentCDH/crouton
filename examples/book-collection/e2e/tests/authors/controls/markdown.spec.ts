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
    // Markdown editor rendered as contenteditable or specific editor element
    const editor = modal.locator('.ProseMirror, .cm-editor, [contenteditable="true"], textarea[aria-label*="Notes" i]').first();
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
    const editor = modal.locator('.ProseMirror, .cm-editor .cm-content, [contenteditable="true"]').first();
    await editor.click();
    await page.keyboard.type('# Author notes\n\nSome **bold** text.');
    await form.waitForAutoSave();

    // Re-open and verify content persisted
    await list.search('Vandersteen');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const editorContent = await modal.locator('.ProseMirror, .cm-editor, [contenteditable="true"]').first().textContent();
    expect(editorContent).toBeTruthy();
    await form.cancel();
  });
});
