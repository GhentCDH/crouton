import type { Locator, Page } from '@playwright/test';

import { Harness } from './Harness';

/**
 * Drives the `@ghentcdh/crouton-ui-vue` `Collapse` component.
 *
 * The collapse uses a hidden `<input type="checkbox" aria-label="Toggle {title}">`
 * to control open/close state. Content lives inside `.collapse-content`.
 */
export class CollapseHarness extends Harness {
  /** Resolve by the collapse title text. */
  static byTitle(parent: Locator | Page, title: string): CollapseHarness {
    const toggle = parent.getByLabel(`Toggle ${title}`);
    /* The collapse root is the grandparent of the checkbox. */
    return new CollapseHarness(toggle.locator('..'));
  }

  static for(locator: Locator): CollapseHarness {
    return new CollapseHarness(locator);
  }

  /** Toggle open/close by clicking the hidden checkbox. */
  async toggle(): Promise<this> {
    await this.checkbox().click();
    return this;
  }

  /** Whether the collapse is currently open (checkbox checked). */
  async isOpen(): Promise<boolean> {
    return this.checkbox().isChecked();
  }

  /** The title text element. */
  title(): Locator {
    return this.locator.locator('.collapse-title span').first();
  }

  /** The content wrapper. */
  content(): Locator {
    return this.locator.locator('.collapse-content');
  }

  private checkbox(): Locator {
    return this.locator.locator('input[type="checkbox"]');
  }
}
