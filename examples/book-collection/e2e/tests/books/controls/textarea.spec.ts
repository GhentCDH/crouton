import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../../page-objects/CroutonListPage';

test.describe('Textarea control — summary field', () => {
  test.describe.configure({ mode: 'serial' });

  test('summary textarea accepts multiline content', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.search('De Ruimteslee');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const summary = 'Line one.\nLine two.\nLine three.';
    await form.fillTextarea('Summary', summary);
    await form.waitForAutoSave();

    // Verify persistence
    await list.search('De Ruimteslee');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const saved = await form.getFieldValue('Summary');
    expect(saved).toContain('Line one.');
    expect(saved).toContain('Line two.');
    await form.cancel();
  });
});
