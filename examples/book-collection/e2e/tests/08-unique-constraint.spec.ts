import { expect, test } from '@playwright/test';

import { CroutonFormPage } from '../page-objects/CroutonFormPage.js';
import { CroutonListPage } from '../page-objects/CroutonListPage.js';

test.describe('unique constraint error', () => {
  test('creating user with duplicate email shows error notification', async ({ page }) => {
    await page.goto('/');
    const list = new CroutonListPage(page);
    const form = new CroutonFormPage(page);

    await list.navigateTo('user');
    await list.waitForRows();

    await list.clickCreate();
    await form.waitForModal();

    // alice@example.com is seeded — this must fail with unique constraint
    await form.fillField('Name', 'Duplicate Alice');
    await form.fillField('Email', 'alice@example.com');

    // Click save and wait for API response
    await page.getByTestId('btn-save').click();

    // Expect error toast notification to appear (modal may stay open)
    // .toast container is hidden when empty; becomes visible when a notification is added
    await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 });

    // Modal should still be visible (form not submitted successfully)
    await expect(page.getByTestId('form-modal')).toBeVisible();
  });
});
