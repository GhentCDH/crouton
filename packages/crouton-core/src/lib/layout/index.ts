import type { z } from 'zod';

import { buildFormLayout } from './builders/form.builder';
import type {
  LayoutBuildContext,
  LayoutVisibility,
  ViewConfig,
} from './builders/layout-builder.types';
import { buildCustomLayouts } from './builders/registry';
import { buildTableLayout } from './builders/table.builder';
import { buildViewLayout } from './builders/view.builder';
import { collectNodeFieldIds, resolveLayoutContext } from './resolve/context-layout';
import type { JsonColumn } from '../resource/Column';
import type { Layout } from './schema/Layout.schema';
import type { FormLayoutNode } from './schema/LayoutNode.schema';
import type { TableLayoutRootSchema } from './schema/TableLayout.schema';

export type {
  LayoutBuildContext,
  LayoutVisibility,
  ViewJsonSchemaSource,
} from './builders/layout-builder.types';
export {
  registerLayoutBuilder,
  unregisterLayoutBuilder,
} from './builders/registry';
export { defaultLayoutFor } from './resolve/default-layout';
export { resolveItemControl } from './resolve/item-control';
export type { ItemControl } from './resolve/item-control';
export { validateLayout } from './resolve/validate';
export type { LayoutValidationResult } from './resolve/validate';

type TableLayoutRoot = z.infer<typeof TableLayoutRootSchema>;

/** Resolve the effective field-id set for each context (explicit items or flag-synthesized). */
export const resolveLayoutVisibility = (
  layout: Layout | undefined,
  columns: JsonColumn[],
): LayoutVisibility => ({
  form: collectNodeFieldIds(resolveLayoutContext(layout, columns, 'form'), 'form'),
  view: collectNodeFieldIds(resolveLayoutContext(layout, columns, 'view'), 'view'),
  table: collectNodeFieldIds(resolveLayoutContext(layout, columns, 'table'), 'table'),
});

const withVisibility = (
  layout: Layout | undefined,
  ctx: LayoutBuildContext,
): LayoutBuildContext =>
  ctx.fieldIds
    ? ctx
    : { ...ctx, fieldIds: resolveLayoutVisibility(layout, ctx.columns ?? []) };

/**
 * Build all views (table, form, filter, view + custom kinds) from a layout declaration and context.
 * Each context resolves its visibility to the explicit layout items when present, otherwise
 * to the ids synthesized from the column flags; builders never read `hiddenIn*` themselves.
 * Key order: table → form → filter → view → custom kinds (registration order).
 */
export const buildLayouts = (
  layout: Layout | undefined,
  ctx: LayoutBuildContext,
): Record<string, ViewConfig> => {
  const resolved = withVisibility(layout, ctx);
  const tableViews = buildTableLayout(
    layout?.table as TableLayoutRoot | undefined,
    resolved,
  );
  const form = buildFormLayout(
    layout?.form as FormLayoutNode | undefined,
    resolved,
  );
  const view = buildViewLayout(
    layout?.view as FormLayoutNode | undefined,
    resolved,
  );
  const result: Record<string, ViewConfig> = {};
  if (tableViews.table) result.table = tableViews.table;
  if (form) result.form = form;
  if (tableViews.filter) result.filter = tableViews.filter;
  if (view) result.view = view;
  Object.assign(result, buildCustomLayouts(layout, resolved));
  return result;
};

