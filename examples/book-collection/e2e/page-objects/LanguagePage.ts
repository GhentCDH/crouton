import type { Page } from '@playwright/test';

export class LanguagePage {
  constructor(private readonly page: Page) {}

  switchLanguage = async (lang: string) => {
    await this.page.locator('select').selectOption(lang);
    await this.page.waitForLoadState('networkidle');
  };

  getCurrentLanguage = async (): Promise<string> => {
    return this.page.locator('select').inputValue();
  };

  getNavLabel = async (resourceId: string): Promise<string> => {
    return this.page.getByTestId(`nav-${resourceId}`).textContent().then((t) => t?.trim() ?? '');
  };

  getColumnHeader = async (label: string): Promise<string> => {
    const header = this.page.getByRole('columnheader', { name: label, exact: false });
    return header.textContent().then((t) => t?.trim() ?? '');
  };
}
