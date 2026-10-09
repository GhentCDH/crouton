import type { Locator, Page } from '@playwright/test';

import { Harness } from './Harness';

/**
 * Drives the `@ghentcdh/crouton-ui-vue` `Modal` component.
 *
 * Renders `<dialog role="dialog" aria-labelledby="{titleId}">` containing an
 * `<h3 id="{titleId}">{{ modalTitle }}</h3>`, an `aria-label="Close"` button
 * (unless `disableClose`), and `#content` / `#actions` slots.
 *
 * The native `<dialog>` element handles focus trap + Esc + backdrop click for
 * us; the harness exposes the surface needed to assert that behavior.
 */
export class ModalHarness extends Harness {
  /**
   * Resolve by the dialog's accessible name (the `modalTitle` shown in the
   * `<h3>`). Note: matches are case-insensitive substring.
   */
  static byTitle(parent: Locator | Page, title: string): ModalHarness {
    return new ModalHarness(parent.getByRole('dialog', { name: title }));
  }

  /** Resolve the only-open dialog. Useful when there's just one at a time. */
  static current(parent: Locator | Page): ModalHarness {
    return new ModalHarness(parent.getByRole('dialog'));
  }

  static for(locator: Locator): ModalHarness {
    return new ModalHarness(locator);
  }

  // ── interactions ──────────────────────────────────────────────────────

  async clickClose(): Promise<this> {
    await this.locator.getByRole('button', { name: 'Close' }).click();
    return this;
  }

  /** Press Esc on the dialog (handled by the native `<dialog>` element). */
  async pressEscape(): Promise<this> {
    await this.locator.press('Escape');
    return this;
  }

  /** Click outside the modal box to attempt a backdrop close. */
  async clickBackdrop(): Promise<this> {
    /* `<dialog>` shows its backdrop via `::backdrop`. The dialog itself
     * receives clicks outside the inner `.modal-box`. */
    await this.locator.click({ position: { x: 5, y: 5 } });
    return this;
  }

  /** Click an action button in the modal's `#actions` slot by accessible name. */
  async clickAction(name: string): Promise<this> {
    await this.locator.getByRole('button', { name }).click();
    return this;
  }

  // ── inspection ────────────────────────────────────────────────────────

  /** The `<h3>` title element. */
  title(): Locator {
    return this.locator.locator('h3').first();
  }

  /** The content slot wrapper. */
  content(): Locator {
    return this.locator.locator('[id$="_content"]').first();
  }

  /** Whether the dialog is currently visible (for `expect().toBeVisible()`). */
  override asLocator(): Locator {
    return this.locator;
  }
}
