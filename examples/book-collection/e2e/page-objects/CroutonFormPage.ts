import type { Page } from '@playwright/test';

export class CroutonFormPage {
  constructor(private readonly page: Page) {}

  waitForModal = async () => {
    await this.page.getByTestId('form-modal').waitFor({ state: 'visible' });
  };

  fillField = async (label: string, value: string) => {
    await this.page.getByLabel(label, { exact: false }).fill(value);
  };

  getFieldValue = async (label: string): Promise<string> => {
    return this.page.getByLabel(label, { exact: false }).inputValue();
  };

  save = async () => {
    await this.page.getByTestId('btn-save').click();
    await this.page.getByTestId('form-modal').waitFor({ state: 'hidden' });
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(400);
  };

  waitForAutoSave = async () => {
    await this.page.getByText('Saved ✓').waitFor({ state: 'visible' });
    await this.page.getByTestId('form-modal').getByRole('button').filter({ hasText: /Close/ }).click();
    await this.page.getByTestId('form-modal').waitFor({ state: 'hidden' });
    await this.page.waitForLoadState('networkidle');
  };

  selectEnum = async (label: string | RegExp, value: string) => {
    await this.page.getByRole('combobox', { name: label }).click();
    await this.page.getByRole('option', { name: value, exact: false }).click();
    await this.page.waitForLoadState('networkidle');
  };

  cancel = async () => {
    const cancelBtn = this.page.getByTestId('btn-cancel');
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    } else {
      await this.page.getByTestId('form-modal').getByRole('button').filter({ hasText: /Close/ }).click();
    }
    await this.page.getByTestId('form-modal').waitFor({ state: 'hidden' });
  };

  expandCollapse = async (title: string) => {
    const modal = this.page.getByTestId('form-modal');
    const toggle = modal
      .locator(`input[type="checkbox"][aria-label="Toggle ${title}"]`)
      .or(modal.locator('.collapse').filter({ hasText: title }).locator('input[type="checkbox"]'))
      .first();
    await toggle.check();
    await this.page.waitForTimeout(300);
  };

  fillTextarea = async (label: string, value: string) => {
    await this.page.getByLabel(label, { exact: false }).fill(value);
  };

  fillMarkdown = async (label: string, value: string) => {
    const modal = this.page.getByTestId('form-modal');
    const editor = modal.locator(`[aria-label="${label}"] .ProseMirror, [aria-label="${label}"] .cm-content, textarea[aria-label="${label}"]`).first();
    await editor.click();
    await editor.fill(value);
  };

  toggleBoolean = async (label: string) => {
    await this.page.getByLabel(label, { exact: false }).click();
  };

  isBooleanChecked = async (label: string): Promise<boolean> => {
    return this.page.getByLabel(label, { exact: false }).isChecked();
  };

  selectToggleOption = async (label: string, value: string) => {
    const modal = this.page.getByTestId('form-modal');
    await modal.getByRole('button', { name: value, exact: false }).click();
    await this.page.waitForLoadState('networkidle');
  };

  fillNumber = async (label: string, value: string) => {
    const input = this.page.getByLabel(label, { exact: false });
    await input.clear();
    await input.fill(value);
  };

  fillDatePicker = async (label: string, date: string) => {
    const input = this.page.getByLabel(label, { exact: false }).first();
    await input.clear();
    await input.fill(date);
    await this.page.keyboard.press('Tab');
    await this.page.waitForTimeout(200);
  };

  setRating = async (label: string, value: number) => {
    const modal = this.page.getByTestId('form-modal');
    await modal.locator(`[aria-label="${label}"] [data-rating="${value}"], [data-testid="rating-${value}"]`).first().click();
  };

  getRatingValue = async (label: string): Promise<number> => {
    const modal = this.page.getByTestId('form-modal');
    const ratingEl = modal.locator(`[aria-label="${label}"] [data-rating], [data-testid^="rating-"]`);
    const val = await ratingEl.getAttribute('data-rating');
    return val ? parseInt(val, 10) : 0;
  };
}
