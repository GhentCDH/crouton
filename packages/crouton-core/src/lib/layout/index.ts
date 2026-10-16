import { buildFormLayout } from './builders/form.builder';
import type { LayoutBuildContext, ViewConfig } from './builders/layout-builder.types';
import { buildTableLayout } from './builders/table.builder';
import { buildViewLayout } from './builders/view.builder';
import type { Layout } from '../resource/layout/Layout.schema';

export type { LayoutBuildContext, ViewJsonSchemaSource } from './builders/layout-builder.types';
export { defaultLayoutFor } from './resolve/default-layout';
export { resolveColumnVisibility } from './resolve/visibility';
export { resolveTableNode } from './model/table-node';
export { collectLayoutFieldIds } from './model/walk';

/**
 * Build all views (table, form, filter, view) from a layout declaration and context.
 * Columns in `ctx.columns` must already have visibility resolved (effective hiddenIn* flags).
 * Key order matches historical output: table → form → filter → view.
 */
export const buildLayouts = (
  layout: Layout | undefined,
  ctx: LayoutBuildContext,
): Record<string, ViewConfig> => {
  const tableViews = buildTableLayout(layout?.table as any, ctx);
  const form = buildFormLayout(layout?.form as any, ctx);
  const view = buildViewLayout(layout?.view as any, ctx);
  // Maintain historical key order: table → form → filter → view
  const result: Record<string, ViewConfig> = {};
  if (tableViews.table) result.table = tableViews.table;
  if (form) result.form = form;
  if (tableViews.filter) result.filter = tableViews.filter;
  if (view) result.view = view;
  return result;
};

