import type { Locator, Page } from '@playwright/test';

import { Harness, byRole } from './Harness';

/**
 * Drives the `@ghentcdh/crouton-ui-vue` `Checkbox` component.
 * Renders `<input role="checkbox" aria-label="{id}">`.
 */
export class BooleanHarness extends Harness {
  static byId(parent: Locator | Page, id: string): BooleanHarness {
    return new BooleanHarness(byRole(parent, 'checkbox', id));
  }

  static byLabel(parent: Locator | Page, label: string): BooleanHarness {
    return new BooleanHarness(byRole(parent, 'checkbox', label));
  }

  static for(locator: Locator): BooleanHarness {
    return new BooleanHarness(locator);
  }

  async fill(value: boolean): Promise<this> {
    if (value) {
      await this.locator.check();
    } else {
      await this.locator.uncheck();
    }
    return this;
  }

  async toggle(): Promise<this> {
    await this.locator.click();
    return this;
  }

  async value(): Promise<boolean> {
    return this.locator.isChecked();
  }
}
