import { expect, test } from '@playwright/test';
import { CroutonListPage } from '../page-objects/CroutonListPage.js';
import { CroutonFormPage } from '../page-objects/CroutonFormPage.js';
import { RelationPicker } from '../page-objects/RelationPicker.js';

test.describe('update + autocomplete label hydration', () => {
  test('editing a book shows author name not id in autocomplete', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const picker = new RelationPicker(page);

    await list.navigateTo('book');
    await list.waitForRows();

    await list.search('Book Title 1');
    await page.waitForTimeout(400);
    await list.waitForRows();

    await list.clickEdit(0);

    // Guard for the known-tricky label hydration path: must show name, not raw id
    const authorValue = await picker.getCurrentValue('Author');
    expect(authorValue).not.toBe('author-1');
    expect(authorValue.toLowerCase()).toContain('orwell');
  });

  test('changing author on a book persists', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);
    const picker = new RelationPicker(page);

    await list.navigateTo('book');
    await list.waitForRows();

    await list.search('Book Title 3');
    await page.waitForTimeout(400);
    await list.waitForRows();
    await list.clickEdit(0);

    await picker.selectAutocomplete('Author', 'Tolkien', 'J.R.R. Tolkien');
    await form.save();

    await list.search('Book Title 3');
    await page.waitForTimeout(400);
    await list.waitForRows();
    await list.clickEdit(0);

    const authorValue = await picker.getCurrentValue('Author');
    expect(authorValue.toLowerCase()).toContain('tolkien');

    await form.cancel();
  });
});
