/**
 * `layout/` — the single module for all layout compilation.
 *
 * Public entry point. Everything outside this directory imports from here only.
 * Internal modules (schema/, model/, resolve/, builders/, ui/) are not imported
 * directly by code outside layout/.
 */

import type { ZodObject, ZodRawShape } from 'zod';

import type { JsonColumn } from '../resource/Column';
import type { Layout } from '../resource/layout/Layout.schema';
import { buildViews } from '../view/view.builder';
import type { ViewConfig } from '../view/view.schema';

// ── Public re-exports ────────────────────────────────────────────────────────

export type { Layout };
export type { FormLayoutNode, LayoutNode } from './schema/form-node.schema';
export type {
  TableNode,
  TableWrapperNode,
} from './schema/table-node.schema';
export {
  findTableNode,
  isTableWrapperLayout,
  resolveTableNode,
} from './model/table-node';
export { collectFieldIds, collectTableFieldIds, walkItems } from './model/walk';
export {
  defaultFormLayout,
  defaultLayoutFor,
  defaultTableLayout,
} from './resolve/default-layout';
export {
  collectLayoutFieldIds,
  resolveColumnVisibility,
} from './resolve/visibility';

// ── buildLayouts ─────────────────────────────────────────────────────────────

/**
 * Compile all views for a resource.
 *
 * When `layout.<ctx>` is defined, that layout is the full list for that context.
 * When absent, columns are filtered by their `hiddenIn*` flag and sorted by position.
 *
 * This is the single entry point for view compilation. `compile-resource.ts` and
 * `json-adapter.ts` both call this instead of `buildViews` directly.
 */
export const buildLayouts = (
  schema: ZodObject<ZodRawShape> | undefined,
  columns: JsonColumn[] | undefined,
  layout?: Layout,
): Record<string, ViewConfig> | undefined => buildViews(schema, columns, layout);
