/**
 * Typed options for crouton UI-schema elements.
 *
 * These type the `options` bag of a standard `@jsonforms/core` element — the builders
 * still emit plain `Layout` / `UISchemaElement` objects (exactly the shape
 * `JsonFormsLayout.uiSchema` consumes), so nothing about the output contract changes.
 */

/** Crouton layout types layered on top of the JSON Forms defaults. */
export const LayoutType = {
  Horizontal: 'HorizontalLayout',
  Vertical: 'VerticalLayout',
  Grid: 'GridLayout',
  Collapse: 'CollapseLayout',
  Group: 'GroupLayout',
} as const;

export type LayoutType = (typeof LayoutType)[keyof typeof LayoutType];

/** Options shared by every UI element. `colspan`/`rowspan` are crouton-custom (read by the renderers). */
export interface CroutonElementOptions {
  label?: string;
  /** 1..12 column span, mapped to a Tailwind class by the layout renderers. */
  colspan?: number;
  /** Row span for CSS grid; mapped to a Tailwind `row-span-*` class. */
  rowspan?: number;
  styles?: Record<string, unknown>;
}

/** Layout-only options. Collapse uses `title` / `titleKey`; Grid carries the column count. */
export interface CroutonLayoutOptions extends CroutonElementOptions {
  title?: string;
  titleKey?: string;
  columns?: number;
}
