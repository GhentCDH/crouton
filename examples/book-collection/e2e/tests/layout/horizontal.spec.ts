import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../page-objects/CroutonListPage';

test.describe('Layout — horizontal container', () => {
  test('author Details section renders bio and notes side-by-side', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('author');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    const bioField = modal.getByLabel('Bio', { exact: false });
    const notesField = modal.getByRole('textbox', { name: /notes/i }).first();

    await expect(bioField).toBeVisible();
    await expect(notesField).toBeVisible();

    // In a horizontal layout, bio and notes should appear on the same row
    // (similar vertical midpoint, different horizontal positions)
    const bioBox = await bioField.boundingBox();
    const notesBox = await notesField.boundingBox();

    if (bioBox && notesBox) {
      // Horizontal layout: both fields in same row (overlapping vertical range)
      // They should start at a similar vertical position (tops within 50px)
      expect(Math.abs(bioBox.y - notesBox.y)).toBeLessThan(50);
      // And horizontally separated
      expect(Math.abs(bioBox.x - notesBox.x)).toBeGreaterThan(50);
    }

    await form.cancel();
  });

  test('author form name field is above the horizontal Details section', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('author');
    await list.waitForRows();
    await list.clickEdit(0);
    await form.waitForModal();

    const modal = page.getByTestId('form-modal');
    const nameField = modal.getByLabel('Name', { exact: false });
    const bioField = modal.getByLabel('Bio', { exact: false });

    await expect(nameField).toBeVisible();
    await expect(bioField).toBeVisible();

    const nameBox = await nameField.boundingBox();
    const bioBox = await bioField.boundingBox();

    // Name (vertical layout root) should be above bio (inside horizontal child)
    if (nameBox && bioBox) {
      expect(nameBox.y).toBeLessThan(bioBox.y);
    }

    await form.cancel();
  });
});
