import type { Locator, Page } from '@playwright/test';

import { Harness } from './Harness';

/**
 * Drives the `@ghentcdh/crouton-ui-vue` `Drawer` component.
 *
 * The drawer has left/right toggle buttons with aria-labels like
 * "Collapse left panel" / "Expand left panel".
 */
export class DrawerHarness extends Harness {
  /** Resolve the drawer as the `<main>` containing the panels. */
  static root(parent: Locator | Page): DrawerHarness {
    return new DrawerHarness(parent.locator('main').first());
  }

  static for(locator: Locator): DrawerHarness {
    return new DrawerHarness(locator);
  }

  async toggleLeft(): Promise<this> {
    await this.leftButton().click();
    return this;
  }

  async toggleRight(): Promise<this> {
    await this.rightButton().click();
    return this;
  }

  async isLeftOpen(): Promise<boolean> {
    const label = await this.leftButton().getAttribute('aria-expanded');
    return label === 'true';
  }

  async isRightOpen(): Promise<boolean> {
    const label = await this.rightButton().getAttribute('aria-expanded');
    return label === 'true';
  }

  leftPanel(): Locator {
    return this.locator.locator('#drawer-left-panel');
  }

  rightPanel(): Locator {
    return this.locator.locator('#drawer-right-panel');
  }

  private leftButton(): Locator {
    return this.locator.locator('button[aria-controls="drawer-left-panel"]');
  }

  private rightButton(): Locator {
    return this.locator.locator('button[aria-controls="drawer-right-panel"]');
  }
}
