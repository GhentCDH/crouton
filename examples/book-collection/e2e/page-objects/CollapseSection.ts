import type { Locator, Page } from '@playwright/test';

export class CollapseSection {
  constructor(private readonly page: Page) {}

  private findToggle = (modal: Locator, title: string): Locator =>
    modal
      .locator(`input[type="checkbox"][aria-label="Toggle ${title}"]`)
      .or(modal.locator('.collapse').filter({ hasText: title }).locator('input[type="checkbox"]'))
      .first();

  expand = async (title: string) => {
    const modal = this.page.getByTestId('form-modal');
    const toggle = this.findToggle(modal, title);
    const isChecked = await toggle.isChecked().catch(() => false);
    if (!isChecked) {
      await toggle.click();
      await this.page.waitForTimeout(300);
    }
  };

  collapse = async (title: string) => {
    const modal = this.page.getByTestId('form-modal');
    const toggle = this.findToggle(modal, title);
    const isChecked = await toggle.isChecked().catch(() => false);
    if (isChecked) {
      await toggle.click();
      await this.page.waitForTimeout(300);
    }
  };

  isExpanded = async (title: string): Promise<boolean> => {
    const modal = this.page.getByTestId('form-modal');
    return this.findToggle(modal, title).isChecked().catch(() => false);
  };
}
