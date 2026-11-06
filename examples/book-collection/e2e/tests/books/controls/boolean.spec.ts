import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../../page-objects/CroutonListPage';

test.describe('Boolean control — featured field', () => {
  test.describe.configure({ mode: 'serial' });

  test('featured checkbox is present and unchecked by default', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.search('De Ruimteslee');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    expect(await form.isBooleanChecked('Featured')).toBe(false);
    await form.cancel();
  });

  test('featured can be toggled and persists', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('book');
    await list.search('De Vliegende Aap');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    await form.toggleBoolean('Featured');
    expect(await form.isBooleanChecked('Featured')).toBe(true);
    await form.waitForAutoSave();

    // Verify persistence
    await list.search('De Vliegende Aap');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();
    expect(await form.isBooleanChecked('Featured')).toBe(true);

    // Reset
    await form.toggleBoolean('Featured');
    await form.waitForAutoSave();
  });
});
