import type { Page } from '@playwright/test';

export class LanguagePage {
  constructor(private readonly page: Page) {}

  private get dropdown() {
    return this.page.locator('#drawer-left-panel .dropdown');
  }

  private localeDisplayName = (lang: string): string => {
    if (lang === 'wv') return 'West Vloams';
    try {
      return new Intl.DisplayNames([lang], { type: 'language' }).of(lang) ?? lang.toUpperCase();
    } catch {
      return lang.toUpperCase();
    }
  };

  switchLanguage = async (lang: string) => {
    await this.dropdown.locator('[role="button"]').click();
    const display = this.localeDisplayName(lang);
    await this.page.locator('#drawer-left-panel .dropdown-content a').filter({ hasText: display }).click();
    await this.page.waitForLoadState('networkidle');
  };

  getCurrentLanguage = async (): Promise<string> => {
    const btn = this.dropdown.locator('[role="button"] span');
    const text = (await btn.textContent())?.trim() ?? '';
    if (/english/i.test(text)) return 'en';
    if (/dutch|neder/i.test(text)) return 'nl';
    return text.toLowerCase();
  };

  getNavLabel = async (resourceId: string): Promise<string> => {
    return this.page.getByTestId(`nav-${resourceId}`).textContent().then((t) => t?.trim() ?? '');
  };

  getColumnHeader = async (label: string): Promise<string> => {
    const header = this.page.getByRole('columnheader', { name: label, exact: false });
    return header.textContent().then((t) => t?.trim() ?? '');
  };
}
