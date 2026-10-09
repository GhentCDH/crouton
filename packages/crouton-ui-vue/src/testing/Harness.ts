import type { Locator, Page } from '@playwright/test';

/**
 * Base class for a Locator-scoped control driver.
 *
 * A Harness wraps one UI control (input, checkbox, autocomplete, …). It is
 * agnostic of routes, fixtures, and the surrounding form — that's the job of
 * `*Fixture` and `*Page` classes in the consuming packages.
 *
 * Concrete harnesses provide one or more `static` factory methods. The two
 * conventional ones are `byLabel` (the user-visible label or aria-label) and
 * `byId` (the `aria-label="{id}"` that lib components emit). Subclasses can
 * add more — e.g. `MarkdownHarness.byTitle`.
 */
export abstract class Harness {
  constructor(protected readonly locator: Locator) {}

  /** Access the Page this harness was scoped against. */
  protected page(): Page {
    return this.locator.page();
  }

  /** Get the underlying Locator — useful for assertions or further scoping. */
  asLocator(): Locator {
    return this.locator;
  }
}

/**
 * Resolve a single role + accessible name inside a parent. The `name` option
 * in Playwright matches accessible names case-insensitively by substring, so
 * both `Author` and `author` will hit the same control.
 */
export const byRole = (
  parent: Locator | Page,
  role:
    | 'textbox'
    | 'spinbutton'
    | 'checkbox'
    | 'combobox'
    | 'button'
    | 'dialog',
  name: string,
): Locator => parent.getByRole(role, { name });
