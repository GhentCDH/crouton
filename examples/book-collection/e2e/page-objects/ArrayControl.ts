import type { Page } from '@playwright/test';

export class ArrayControl {
  constructor(private readonly page: Page) {}

  private container = (field: string) =>
    this.page.getByTestId('form-modal').locator(`[data-field="${field}"], [aria-label="${field}"]`).first();

  addItem = async (field: string, value: string) => {
    const container = this.container(field);
    const input = container.locator('input[type="text"]').last();
    await input.fill(value);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(200);
  };

  removeItem = async (field: string, index: number) => {
    const container = this.container(field);
    const removeButtons = container.getByRole('button', { name: /remove|delete|×/i });
    await removeButtons.nth(index).click();
    await this.page.waitForTimeout(200);
  };

  getItems = async (field: string): Promise<string[]> => {
    const container = this.container(field);
    const items = container.locator('[data-item], .array-item, li');
    const count = await items.count();
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await items.nth(i).textContent();
      if (text?.trim()) result.push(text.trim());
    }
    return result;
  };
}
