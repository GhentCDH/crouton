import type { Locator, Page } from '@playwright/test';

import { Harness, byRole } from './Harness';

/**
 * Drives the `@ghentcdh/crouton-ui-vue` `InputNumber` component.
 * Renders `<input type="number" aria-label="{id}">` — role `spinbutton`.
 */
export class NumberHarness extends Harness {
  static byId(parent: Locator | Page, id: string): NumberHarness {
    return new NumberHarness(byRole(parent, 'spinbutton', id));
  }

  static byLabel(parent: Locator | Page, label: string): NumberHarness {
    return new NumberHarness(byRole(parent, 'spinbutton', label));
  }

  static for(locator: Locator): NumberHarness {
    return new NumberHarness(locator);
  }

  async fill(value: number): Promise<this> {
    await this.locator.click();
    await this.locator.fill(String(value));
    /* Number inputs commit on blur. */
    await this.locator.press('Tab');
    return this;
  }

  async clear(): Promise<this> {
    await this.locator.fill('');
    return this;
  }

  async value(): Promise<number | null> {
    const raw = await this.locator.inputValue();
    return raw === '' ? null : Number(raw);
  }
}
