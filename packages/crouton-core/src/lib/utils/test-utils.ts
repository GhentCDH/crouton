import type { ControlElement, Layout, UISchemaElement } from '@jsonforms/core';

/**
 * Cast an unknown value to `T` — for test fixtures that are intentionally
 * partial or invalid. The cast is centralised here so specs never need
 * double casts.
 */
export const invalid = <T>(value: unknown): T => value as T;

/** A control as the specs read it: `options` narrowed to a plain record. */
export type TestControl = Omit<ControlElement, 'options'> & {
  options?: Record<string, unknown>;
};

/** A layout whose children are the narrowed controls above. */
export type TestLayout = Omit<Layout, 'elements'> & {
  elements: UISchemaElement[];
};

export const asControl = (el: unknown): TestControl | undefined => el as TestControl | undefined;

export const asLayout = (ui: unknown): TestLayout => ui as TestLayout;
