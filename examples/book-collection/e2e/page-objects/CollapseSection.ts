import type { Page } from '@playwright/test';

export class CollapseSection {
  constructor(private readonly page: Page) {}

  expand = async (title: string) => {
    const modal = this.page.getByTestId('form-modal');
    const toggle = modal.locator(`input[type="checkbox"][aria-label="Toggle ${title}"], button[aria-label*="${title}"]`).first();
    const isChecked = await toggle.isChecked().catch(() => false);
    if (!isChecked) {
      await toggle.click();
      await this.page.waitForTimeout(300);
    }
  };

  collapse = async (title: string) => {
    const modal = this.page.getByTestId('form-modal');
    const toggle = modal.locator(`input[type="checkbox"][aria-label="Toggle ${title}"], button[aria-label*="${title}"]`).first();
    const isChecked = await toggle.isChecked().catch(() => false);
    if (isChecked) {
      await toggle.click();
      await this.page.waitForTimeout(300);
    }
  };

  isExpanded = async (title: string): Promise<boolean> => {
    const modal = this.page.getByTestId('form-modal');
    const toggle = modal.locator(`input[type="checkbox"][aria-label="Toggle ${title}"]`).first();
    return toggle.isChecked().catch(() => false);
  };
}
