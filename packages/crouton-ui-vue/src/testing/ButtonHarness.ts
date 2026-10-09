import type { Locator, Page } from '@playwright/test';

import { Harness, byRole } from './Harness';

/**
 * Drives the `@ghentcdh/crouton-ui-vue` `Btn` component.
 *
 * Renders `<button>` (or `<a>`) with optional icon, tooltip, disabled state,
 * and emits `click`.
 */
export class ButtonHarness extends Harness {
  /** Resolve by accessible name (button text / aria-label). */
  static byName(parent: Locator | Page, name: string): ButtonHarness {
    return new ButtonHarness(byRole(parent, 'button', name));
  }

  static for(locator: Locator): ButtonHarness {
    return new ButtonHarness(locator);
  }

  async click(): Promise<this> {
    await this.locator.click();
    return this;
  }

  async isDisabled(): Promise<boolean> {
    return this.locator.isDisabled();
  }

  async text(): Promise<string> {
    return (await this.locator.textContent()) ?? '';
  }
}
