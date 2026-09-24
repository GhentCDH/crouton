import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../../page-objects/CroutonFormPage';
import { CroutonListPage } from '../../page-objects/CroutonListPage';
import { RelationPicker } from '../../page-objects/RelationPicker';

test.describe('Update', () => {
  test.describe.configure({ mode: 'serial' });
  test.describe('enum/status display', () => {
    test('status column renders enum value', async ({ page }) => {
      await page.goto('/');
      const list = new CroutonListPage(page);

      await list.navigateTo('book');
      await list.waitForRows();

      // Seed: book-1 has status "draft" (index 0, cycling draft/published/archived)
      await list.search('Book Title 1');
      await list.waitForRows();

      const rows = list.getRows();
      const firstRow = rows.first();
      await expect(firstRow).toContainText(/draft/i);
    });

    test('status column renders Published label for published books', async ({
      page,
    }) => {
      await page.goto('/');
      const list = new CroutonListPage(page);

      await list.navigateTo('book');
      await list.waitForRows();

      // Seed: book-2 has status "published"
      await list.search('Book Title 2');
      await list.waitForRows();

      const firstRow = list.getRows().first();
      await expect(firstRow).toContainText(/published/i);
    });

    test.describe('update + autocomplete label hydration', () => {
      test('editing a book shows author name not id in autocomplete', async ({
        page,
      }) => {
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
        await form.waitForAutoSave();

        await list.search('Book Title 3');
        await page.waitForTimeout(400);
        await list.waitForRows();
        await list.clickEdit(0);

        const authorValue = await picker.getCurrentValue('Author');
        expect(authorValue.toLowerCase()).toContain('tolkien');

        await form.cancel();
      });
    });

    test('status can be changed via enum select in edit form', async ({
      page,
    }) => {
      await page.goto('/');
      const list = new CroutonListPage(page);
      const form = new CroutonFormPage(page);

      await list.navigateTo('book');
      await list.waitForRows();

      // Edit book-1 (status=draft) and change to Published
      await list.search('Book Title 1');
      await list.waitForRows();
      await list.clickEdit(0);
      await form.waitForModal();

      await form.selectEnum(/status/i, 'published');
      await form.waitForAutoSave();

      // Verify status updated in table
      await list.search('Book Title 1');
      await list.waitForRows();
      const firstRow = list.getRows().first();
      await expect(firstRow).toContainText(/published/i);

      // Reset back to draft for test isolation
      await list.clickEdit(0);
      await form.waitForModal();
      await form.selectEnum(/status/i, 'draft');
      await form.cancel();
    });
  });

});
