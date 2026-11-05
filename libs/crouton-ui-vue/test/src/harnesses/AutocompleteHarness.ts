import type { Locator, Page } from '@playwright/test';

import { Harness, byRole } from './Harness';

/**
 * Drives the `@ghentcdh/crouton-ui-vue` `AutoComplete` component.
 *
 * Input is `role="combobox"`. Options are portaled `role="option"` items.
 * The component supports remote-fetched options, freeText mode, and an
 * optional "Create new" button.
 */
export class AutocompleteHarness extends Harness {
  static byId(parent: Locator | Page, id: string): AutocompleteHarness {
    return new AutocompleteHarness(byRole(parent, 'combobox', id));
  }

  static byLabel(parent: Locator | Page, label: string): AutocompleteHarness {
    return new AutocompleteHarness(byRole(parent, 'combobox', label));
  }

  static for(locator: Locator): AutocompleteHarness {
    return new AutocompleteHarness(locator);
  }

  /** Type a query, wait for the matching option, click it. */
  async fill(value: string): Promise<this> {
    await this.locator.click();
    await this.locator.fill(value);
    await this.page().getByRole('option', { name: value }).locator('a').click();
    return this;
  }

  /** Just type a query without selecting — useful for asserting dropdown state. */
  async query(value: string): Promise<this> {
    await this.locator.click();
    await this.locator.fill(value);
    return this;
  }

  /** Pick a specific option by visible label, after `query()` has filtered. */
  async pickOption(label: string): Promise<this> {
    await this.page().getByRole('option', { name: label }).locator('a').click();
    return this;
  }

  /** Press a key — useful for arrow-down / Enter / Esc keyboard nav tests. */
  async press(key: string): Promise<this> {
    await this.locator.press(key);
    return this;
  }

  /** Click the "Create new" button (requires `enableCreate`). */
  async clickCreateNew(): Promise<void> {
    const group = this.locator.locator('xpath=ancestor::*[@role="select"][1]');
    await group.getByRole('button', { name: 'create' }).click();
  }

  async clear(): Promise<this> {
    const group = this.locator.locator('xpath=ancestor::*[@role="select"][1]');
    await group.getByRole('button', { name: 'Clear' }).click();
    return this;
  }

  async value(): Promise<string> {
    return this.locator.inputValue();
  }

  /** The listbox is portaled — locate it relative to the Page. */
  listbox(): Locator {
    return this.page().getByRole('listbox');
  }

  options(): Locator {
    return this.page().getByRole('option');
  }
}
