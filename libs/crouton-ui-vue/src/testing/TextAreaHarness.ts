import type { Locator, Page } from '@playwright/test';

import { Harness, byRole } from './Harness';

/**
 * Drives the `@ghentcdh/crouton-ui-vue` `Textarea` component.
 * Plain text-area; use `MarkdownHarness` for the rich editor.
 */
export class TextAreaHarness extends Harness {
  static byId(parent: Locator | Page, id: string): TextAreaHarness {
    return new TextAreaHarness(byRole(parent, 'textbox', id));
  }

  static byLabel(parent: Locator | Page, label: string): TextAreaHarness {
    return new TextAreaHarness(byRole(parent, 'textbox', label));
  }

  static for(locator: Locator): TextAreaHarness {
    return new TextAreaHarness(locator);
  }

  async fill(value: string): Promise<this> {
    await this.locator.click();
    await this.locator.fill(value);
    return this;
  }

  async clear(): Promise<this> {
    await this.locator.fill('');
    return this;
  }

  async value(): Promise<string> {
    return this.locator.inputValue();
  }
}
