import type { Locator, Page } from '@playwright/test';

import { Harness } from './Harness';

/**
 * Drives the `@ghentcdh/crouton-ui-vue` `Alert` component.
 *
 * Renders `<div role="alert">` with a message and type-based CSS class.
 */
export class AlertHarness extends Harness {
  /** Resolve the alert by its message text. */
  static byMessage(parent: Locator | Page, message: string): AlertHarness {
    return new AlertHarness(
      parent.getByRole('alert').filter({ hasText: message }),
    );
  }

  /** Resolve the first (or only) alert on the page. */
  static first(parent: Locator | Page): AlertHarness {
    return new AlertHarness(parent.getByRole('alert').first());
  }

  static for(locator: Locator): AlertHarness {
    return new AlertHarness(locator);
  }

  async message(): Promise<string> {
    return (await this.locator.locator('span').textContent()) ?? '';
  }

  async hasClass(cls: string): Promise<boolean> {
    const classes = (await this.locator.getAttribute('class')) ?? '';
    return classes.includes(cls);
  }
}
