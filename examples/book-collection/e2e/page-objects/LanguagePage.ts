import type { Page } from '@playwright/test';

export class LanguagePage {
  constructor(private readonly page: Page) {}

  private get languageSelect() {
    return this.page.locator('#drawer-left-panel select');
  }

  switchLanguage = async (lang: string) => {
    await Promise.all([
      this.page.waitForResponse((r) => r.url().includes('/_app/layout') && r.status() === 200),
      this.languageSelect.selectOption(lang),
    ]);
    await this.page.waitForLoadState('networkidle');
  };

  getCurrentLanguage = async (): Promise<string> => {
    return this.languageSelect.inputValue();
  };

  getNavLabel = async (resourceId: string): Promise<string> => {
    return this.page.getByTestId(`nav-${resourceId}`).textContent().then((t) => t?.trim() ?? '');
  };

  getColumnHeader = async (label: string): Promise<string> => {
    const header = this.page.getByRole('columnheader', { name: label, exact: false });
    return header.textContent().then((t) => t?.trim() ?? '');
  };
}
