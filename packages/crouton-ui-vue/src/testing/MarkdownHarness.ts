import type { Locator, Page } from '@playwright/test';

import { Harness, byRole } from './Harness';

export type MarkdownToolbarButton = 'B' | 'I';

/**
 * Drives the `@ghentcdh/crouton-ui-vue` `Markdown` component (TipTap-backed).
 *
 * The locator is the control wrapper (`data-control-id`): it holds a toolbar of
 * `<button>`s whose visible text is the mark label (`B`, `I`, …) and the
 * TipTap editing surface, a `role="textbox"` named by the field label.
 */
export class MarkdownHarness extends Harness {
  static byId(parent: Locator | Page, id: string): MarkdownHarness {
    return new MarkdownHarness(parent.locator(`[data-control-id="${id}"]`));
  }

  static byLabel(parent: Locator | Page, label: string): MarkdownHarness {
    return new MarkdownHarness(
      byRole(parent, 'textbox', label).locator('xpath=ancestor::*[@data-control-id][1]'),
    );
  }

  static for(locator: Locator): MarkdownHarness {
    return new MarkdownHarness(locator);
  }

  /** The editable TipTap surface inside the wrapper. */
  private get editor(): Locator {
    return this.locator.getByRole('textbox');
  }

  async fill(value: string): Promise<this> {
    await this.editor.fill(value);
    return this;
  }

  async clear(): Promise<this> {
    await this.editor.fill('');
    return this;
  }

  async typeBold(text: string): Promise<this> {
    await this.toolbar('B').click();
    await this.editor.pressSequentially(text);
    await this.toolbar('B').click();
    return this;
  }

  async typeItalic(text: string): Promise<this> {
    await this.toolbar('I').click();
    await this.editor.pressSequentially(text);
    await this.toolbar('I').click();
    return this;
  }

  async type(text: string): Promise<this> {
    await this.editor.pressSequentially(text);
    return this;
  }

  toolbar(name: MarkdownToolbarButton): Locator {
    return this.locator.getByRole('button', { name });
  }

  /** Is a toolbar mark currently active (the lib adds `btn-active`)? */
  async isMarkActive(name: MarkdownToolbarButton): Promise<boolean> {
    const cls = (await this.toolbar(name).getAttribute('class')) ?? '';
    return cls.includes('btn-active');
  }
}
