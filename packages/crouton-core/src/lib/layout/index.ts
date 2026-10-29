import { buildFormLayout } from './builders/form.builder';
import type {
  LayoutBuildContext,
  ViewConfig,
} from './builders/layout-builder.types';
import { buildCustomLayouts } from './builders/registry';
import { buildTableLayout } from './builders/table.builder';
import { buildViewLayout } from './builders/view.builder';
import type { Layout } from './schema/Layout.schema';
import type { FormLayoutNode } from './schema/LayoutNode.schema';

export type {
  LayoutBuildContext,
  ViewJsonSchemaSource,
} from './builders/layout-builder.types';
export {
  type KindBuilderFn,
  registerLayoutBuilder,
  unregisterLayoutBuilder,
} from './builders/registry';
export { defaultLayoutFor } from './resolve/default-layout';
export { resolveItemControl } from './resolve/item-control';
export type { ItemControl } from './resolve/item-control';
export { validateLayout } from './resolve/validate';
export type { LayoutValidationResult } from './resolve/validate';

/**
 * Build a single named view kind from the layout.
 * Built-in kinds: 'table', 'form', 'view', 'filter'. Custom kinds via registerLayoutBuilder.
 */
export const buildLayout = (
  kind: 'table' | 'form' | 'view' | 'filter' | string,
  layout: Layout | undefined,
  ctx: LayoutBuildContext,
): Record<string, ViewConfig> => {
  if (kind === 'table' || kind === 'filter') {
    const all = buildTableLayout(layout?.table, ctx);
    return kind === 'filter'
      ? all.filter
        ? { filter: all.filter }
        : {}
      : all.table
        ? { table: all.table }
        : {};
  }
  if (kind === 'form') {
    const form = buildFormLayout(layout?.form as FormLayoutNode | undefined, ctx);
    return form ? { form } : {};
  }
  if (kind === 'view') {
    const view = buildViewLayout(layout?.view as FormLayoutNode | undefined, ctx);
    return view ? { view } : {};
  }
  return buildCustomLayouts(layout, ctx);
};

/**
 * Build all views (table, form, filter, view + custom kinds) from a layout declaration and context.
 * Columns in `ctx.columns` must already have visibility resolved (effective hiddenIn* flags).
 * Key order: table → form → filter → view → custom kinds (registration order).
 */
export const buildLayouts = (
  layout: Layout | undefined,
  ctx: LayoutBuildContext,
): Record<string, ViewConfig> => {
  const tableViews = buildTableLayout(layout?.table, ctx);
  const form = buildFormLayout(layout?.form as FormLayoutNode | undefined, ctx);
  const view = buildViewLayout(layout?.view as FormLayoutNode | undefined, ctx);
  const result: Record<string, ViewConfig> = {};
  if (tableViews.table) result.table = tableViews.table;
  if (form) result.form = form;
  if (tableViews.filter) result.filter = tableViews.filter;
  if (view) result.view = view;
  Object.assign(result, buildCustomLayouts(layout, ctx));
  return result;
};
