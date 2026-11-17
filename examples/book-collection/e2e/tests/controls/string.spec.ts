import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

/**
 * String control in isolation — each variant on /controls/string renders its
 * own form with one option set (see apps/frontend/src/controls/string.variants.ts).
 */
test.describe('String control', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/controls/string');
    await expect(page.getByTestId('control-page-string')).toBeVisible();
  });

  const variant = (page: Page, id: string) =>
    page.getByTestId(`variant-${id}`);

  test('default: label derived from property name, typing updates the value', async ({ page }) => {
    const v = variant(page, 'default');
    const input = v.getByRole('textbox', { name: 'Value' });

    await expect(input).toHaveValue('');
    await expect(input).toHaveAttribute('type', 'text');
    await input.fill('abc');
    await expect(v.getByTestId('value')).toHaveText('{"value":"abc"}');
  });

  test('initial value is shown and can be edited', async ({ page }) => {
    const v = variant(page, 'initial-value');
    const input = v.getByRole('textbox', { name: 'Value' });

    await expect(input).toHaveValue('Hello');
    await input.fill('Hello world');
    await expect(v.getByTestId('value')).toHaveText('{"value":"Hello world"}');
  });

  test('label option overrides the label', async ({ page }) => {
    const v = variant(page, 'label');
    await expect(v.getByRole('group', { name: 'Custom label' })).toBeVisible();
    await expect(v.getByRole('textbox', { name: 'Custom label' })).toBeVisible();
  });

  test('schema title is used as label', async ({ page }) => {
    const v = variant(page, 'schema-title');
    await expect(v.getByRole('textbox', { name: 'Schema title' })).toBeVisible();
  });

  test('hideLabel hides the visible label but keeps the accessible name', async ({ page }) => {
    const v = variant(page, 'hide-label');
    await expect(v.getByRole('textbox', { name: 'Value' })).toBeVisible();
    await expect(v.getByRole('group', { name: 'Value' })).toHaveCount(0);
  });

  test('placeholder is shown when empty', async ({ page }) => {
    const input = variant(page, 'placeholder').getByRole('textbox', { name: 'Value' });
    await expect(input).toHaveAttribute('placeholder', 'Type here…');
  });

  test('required: marked with * and shows an error when cleared', async ({ page }) => {
    const v = variant(page, 'required');
    const group = v.getByRole('group', { name: 'Value*' });

    await expect(group).toBeVisible();
    await expect(group).not.toContainText('This field is required');

    await v.getByRole('textbox', { name: 'Value' }).clear();
    await page.keyboard.press('Tab');
    await expect(group).toContainText('This field is required');

    await v.getByRole('textbox', { name: 'Value' }).fill('again');
    await expect(group).not.toContainText('This field is required');
  });

  test('errorMessage option replaces the default validation message', async ({ page }) => {
    const v = variant(page, 'error-message');
    await v.getByRole('textbox', { name: 'Value' }).clear();
    await page.keyboard.press('Tab');

    const group = v.getByRole('group', { name: 'Value*' });
    await expect(group).toContainText('Please fill this in');
    await expect(group).not.toContainText('This field is required');
  });

  test('readonly renders a non-editable input with the value', async ({ page }) => {
    const input = variant(page, 'readonly').getByRole('textbox', { name: 'Value' });
    await expect(input).toHaveValue('Read only');
    await expect(input).toBeDisabled();
  });

  test('disabled renders a non-editable input with the value', async ({ page }) => {
    const input = variant(page, 'disabled').getByRole('textbox', { name: 'Value' });
    await expect(input).toHaveValue('Disabled');
    await expect(input).toBeDisabled();
  });

  test('disabledWhen toggles with the other field', async ({ page }) => {
    const v = variant(page, 'disabled-when');
    const lock = v.getByRole('textbox', { name: 'Lock' });
    const input = v.getByRole('textbox', { name: 'Value' });

    await expect(input).toBeEnabled();
    await lock.fill('x');
    await expect(input).toBeDisabled();
    await lock.clear();
    await expect(input).toBeEnabled();
  });

  test('email format renders an email input', async ({ page }) => {
    const input = variant(page, 'email').getByRole('textbox', { name: 'Value' });
    await expect(input).toHaveAttribute('type', 'email');
  });

  test('uri format renders a url input', async ({ page }) => {
    const input = variant(page, 'uri').getByRole('textbox', { name: 'Value' });
    await expect(input).toHaveAttribute('type', 'url');
  });
});
