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
    await this.page.getByPlaceholder('Search...').fill(query);
    await this.page.waitForTimeout(400);
    await this.page.waitForLoadState('networkidle');
  };

  clearSearch = async () => {
    await this.page.getByPlaceholder('Search...').clear();
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
    await this.page.getByRole('button', { name: 'Ok', exact: true }).click();
    await this.page
      .getByText(/data deleted/i)
      .waitFor({ state: 'visible', timeout: 5000 });
    await this.page.waitForLoadState('networkidle');
  };

  waitForRows = async () => {
    await expect(this.getRows().first()).toBeVisible({ timeout: 10_000 });
  };

  waitForNoRow = async () => {
    await expect(this.page.locator('tbody td').filter({ hasText: /no records found/i })).toBeVisible({ timeout: 10_000 });
  };

  openFilterPanel = async () => {
    await this.page.getByRole('button', { name: /Filters/i }).click();
  };

  setFirstFilterField = async (fieldLabel: string) => {
    await this.page.getByRole('combobox').first().click();
    await this.page.getByRole('option', { name: fieldLabel }).click();
  };

  setFirstFilterValue = async (value: string) => {
    await this.page.getByPlaceholder('Enter a value').fill(value);
  };

  applyFilter = async () => {
    await this.page.getByRole('button', { name: 'Apply' }).click();
    await this.page.waitForLoadState('networkidle');
  };

  resetFilter = async () => {
    await this.page.getByRole('button', { name: 'Reset' }).click();
    await this.page.waitForLoadState('networkidle');
  };
}
