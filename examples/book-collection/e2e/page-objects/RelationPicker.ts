import type { Page } from '@playwright/test';

export class RelationPicker {
  constructor(private readonly page: Page) {}

  selectAutocomplete = async (label: string, searchText: string, optionText: string) => {
    const field = this.page.getByRole('combobox', { name: new RegExp(label, 'i') });
    await field.click();
    await field.fill(searchText);
    await this.page.getByRole('option', { name: optionText }).click();
  };

  getCurrentValue = async (label: string): Promise<string> => {
    return this.page.getByRole('combobox', { name: new RegExp(label, 'i') }).inputValue();
  };
}
