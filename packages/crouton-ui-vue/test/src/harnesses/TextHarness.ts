import type { Locator, Page } from '@playwright/test';

import { Harness, byRole } from './Harness';

/**
 * Drives the `@ghentcdh/crouton-ui-vue` `Input` component. The component renders
 * `<input aria-label="{id}">` inside a `ControlWrapper`, so we look up by
 * the aria-label (= `id`) by default.
 */
export class TextHarness extends Harness {
  static byId(parent: Locator | Page, id: string): TextHarness {
    return new TextHarness(byRole(parent, 'textbox', id));
  }

  /** Resolve by visible label (the `<legend>` text). */
  static byLabel(parent: Locator | Page, label: string): TextHarness {
    return new TextHarness(byRole(parent, 'textbox', label));
  }

  static for(locator: Locator): TextHarness {
    return new TextHarness(locator);
  }

  async fill(value: string): Promise<this> {
    await this.locator.click();
    await this.locator.fill(value);
    return this;
  }

  /** Type character-by-character — useful when the control reacts to each keystroke. */
  async type(value: string): Promise<this> {
    await this.locator.click();
    await this.locator.pressSequentially(value);
    return this;
  }

  async clear(): Promise<this> {
    await this.locator.fill('');
    return this;
  }

  async value(): Promise<string> {
    return this.locator.inputValue();
  }

  async blur(): Promise<this> {
    await this.locator.press('Tab');
    return this;
  }
}
