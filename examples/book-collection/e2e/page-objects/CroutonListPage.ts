import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class CroutonListPage {
  constructor(private readonly page: Page) {}

  navigateTo = async (resourceId: string) => {
    await this.page.getByTestId(`nav-${resourceId}`).click();
    await this.page.waitForURL(`**/crouton/${resourceId}`);
    await this.page.waitForLoadState('networkidle');
  };

  getRows = (): Locator =>
    this.page
      .getByRole('table')
      .getByRole('row')
      .filter({ hasNot: this.page.getByRole('columnheader') });

  getRowCount = async (): Promise<number> => this.getRows().count();

  search = async (query: string) => {
    await this.page.getByTestId('search-input').fill(query);
    await this.page.waitForTimeout(400);
    await this.page.waitForLoadState('networkidle');
  };

  clearSearch = async () => {
    await this.page.getByTestId('search-input').clear();
    await this.page.waitForTimeout(400);
    await this.page.waitForLoadState('networkidle');
  };

  clickCreate = async () => {
    await this.page.getByTestId('btn-create').first().click();
    await this.page.getByTestId('form-modal').waitFor({ state: 'visible' });
  };

  clickEdit = async (rowIndex: number) => {
    const row = this.getRows().nth(rowIndex);
    await row.hover();
    await row.getByRole('button', { name: /edit|update/i }).click();
    await this.page.getByTestId('form-modal').waitFor({ state: 'visible' });
  };

  clickView = async (rowIndex: number) => {
    const row = this.getRows().nth(rowIndex);
    await row.hover();
    await row.getByRole('button', { name: /view/i }).click();
    await this.page.getByTestId('form-modal').waitFor({ state: 'visible' });
  };

  clickDelete = async (rowIndex: number) => {
    const row = this.getRows().nth(rowIndex);
    await row.hover();
    await row.getByRole('button', { name: /delete|remove/i }).click();
  };

  confirmDelete = async () => {
    await this.page.getByRole('button', { name: 'Ok' }).click();
    await this.page.waitForLoadState('networkidle');
  };

  waitForRows = async () => {
    await expect(this.getRows().first()).toBeVisible({ timeout: 10_000 });
  };
}
