import type { Locator, Page } from '@playwright/test';

import { Harness, byRole } from './Harness';

/**
 * Drives the `@ghentcdh/crouton-ui-vue` `MultiSelect` component.
 * Combobox shape like `SelectHarness`, but the list stays open across picks.
 */
export class MultiSelectHarness extends Harness {
  static byId(parent: Locator | Page, id: string): MultiSelectHarness {
    return new MultiSelectHarness(byRole(parent, 'combobox', id));
  }

  static byLabel(parent: Locator | Page, label: string): MultiSelectHarness {
    return new MultiSelectHarness(byRole(parent, 'combobox', label));
  }

  static for(locator: Locator): MultiSelectHarness {
    return new MultiSelectHarness(locator);
  }

  async open(): Promise<this> {
    await this.locator.click();
    return this;
  }

  async fill(labels: string[]): Promise<this> {
    await this.open();
    for (const label of labels) {
      await this.page()
        .getByRole('option', { name: label })
        .locator('a')
        .click();
    }
    /* Close by clicking the combobox again. */
    await this.locator.click();
    return this;
  }

  async select(label: string): Promise<this> {
    await this.open();
    await this.page().getByRole('option', { name: label }).locator('a').click();
    return this;
  }

  /** Remove a selected chip by its label. */
  async removeChip(label: string): Promise<this> {
    const group = this.locator.locator('xpath=ancestor::*[@role="select"][1]');
    await group.getByText(label, { exact: true }).getByRole('button').click();
    return this;
  }
}
