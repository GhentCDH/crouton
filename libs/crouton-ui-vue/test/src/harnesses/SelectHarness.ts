import type { Locator, Page } from '@playwright/test';

import { Harness, byRole } from './Harness';

/**
 * Drives the `@ghentcdh/crouton-ui-vue` `SelectComponent`.
 *
 * Combobox button (`role="combobox"`) opens a portaled `role="listbox"` with
 * `role="option"` items, each containing an `<a>` that emits the selection.
 */
export class SelectHarness extends Harness {
  static byId(parent: Locator | Page, id: string): SelectHarness {
    return new SelectHarness(byRole(parent, 'combobox', id));
  }

  static byLabel(parent: Locator | Page, label: string): SelectHarness {
    return new SelectHarness(byRole(parent, 'combobox', label));
  }

  static for(locator: Locator): SelectHarness {
    return new SelectHarness(locator);
  }

  async open(): Promise<this> {
    await this.locator.click();
    return this;
  }

  async fill(label: string): Promise<this> {
    return this.select(label);
  }

  async select(label: string): Promise<this> {
    await this.open();
    /* Options are portaled — resolve through the Page. */
    await this.page().getByRole('option', { name: label }).locator('a').click();
    return this;
  }

  async value(): Promise<string> {
    return (await this.locator.textContent())?.trim() ?? '';
  }

  /** Click the "Clear" button rendered next to the select. */
  async clear(): Promise<this> {
    const group = this.locator.locator('xpath=ancestor::*[@role="select"][1]');
    await group.getByRole('button', { name: 'Clear' }).click();
    return this;
  }

  /**
   * Click the "Create new" button. Requires `enableCreate` to be set on
   * the component (SelectWrapper conditionally renders the button).
   */
  async clickCreateNew(): Promise<void> {
    const group = this.locator.locator('xpath=ancestor::*[@role="select"][1]');
    await group.getByRole('button', { name: 'create' }).click();
  }
}
