import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

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
    await this.page.getByTestId('form-modal').getByRole('button').filter({ hasText: /cancel|close/i }).click();
    await this.page.getByTestId('form-modal').waitFor({ state: 'hidden' });
  };
}
