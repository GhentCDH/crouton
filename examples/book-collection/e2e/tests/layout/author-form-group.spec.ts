import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

test.describe('Layout — author form group', () => {
  test('author form has Details group with bio and notes', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('author');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');

    // Name field present
    await expect(modal.getByLabel('Name', { exact: false })).toBeVisible();

    // "Details" group label visible
    const detailsGroup = modal.locator('text=Details').first();
    await expect(detailsGroup).toBeVisible();

    // Bio and Notes fields present in the form
    await expect(modal.getByLabel('Bio', { exact: false })).toBeVisible();
    await expect(modal.locator('[aria-label*="Notes" i], .markdown-editor, [data-field="notes"]').first()).toBeVisible();

    await form.cancel();
  });

  test('author name field is at top (above Details group)', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('author');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');

    const nameBox = await modal.getByLabel('Name', { exact: false }).boundingBox();
    const detailsBox = await modal.locator('text=Details').first().boundingBox();

    expect(nameBox).not.toBeNull();
    expect(detailsBox).not.toBeNull();
    if (!nameBox || !detailsBox) return;
    // Name should be above Details group
    expect(nameBox.y).toBeLessThan(detailsBox.y);

    await form.cancel();
  });
});
