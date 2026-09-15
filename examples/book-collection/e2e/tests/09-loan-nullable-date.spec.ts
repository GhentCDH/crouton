import { expect, test } from '@playwright/test';
import { CroutonListPage } from '../page-objects/CroutonListPage.js';
import { CroutonFormPage } from '../page-objects/CroutonFormPage.js';
import { RelationPicker } from '../page-objects/RelationPicker.js';

test.describe('loan creation with nullable returnedAt', () => {
  test('create loan without returnedAt succeeds', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);
    const picker = new RelationPicker(page);

    await list.navigateTo('loan');
    await list.waitForRows();
    const initialCount = await list.getRowCount();

    await list.clickCreate();
    await form.waitForModal();

    // Select user (manyToOne autocomplete)
    await picker.selectAutocomplete('User', 'Alice', 'Alice');

    // Select book (manyToOne autocomplete)
    await picker.selectAutocomplete('Book', 'Book Title 5', 'Book Title 5');

    // Leave returnedAt empty (it's nullable / required: false)
    // loanedAt has a default so we don't fill it

    await form.save();

    // Verify loan was created — row count increased
    await list.waitForRows();
    const newCount = await list.getRowCount();
    expect(newCount).toBeGreaterThan(initialCount);
  });
});
