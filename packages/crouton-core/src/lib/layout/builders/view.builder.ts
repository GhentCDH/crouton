import type { LayoutBuildContext, ViewConfig } from './layout-builder.types';
import { buildView } from './view-helpers';
import { buildFormUiSchema, buildFormUiSchemaFromLayout } from '../../view';
import { columnForContext } from '../../view/column.utils';
import type { FormLayoutNode, LayoutNode } from '../schema/LayoutNode.schema';

/**
 * Build the detail (read-only) view for a resource.
 * When `node` is present it is the explicit layout; absent = column-flag fallback.
 */
export const buildViewLayout = (
  node: FormLayoutNode | undefined,
  ctx: LayoutBuildContext,
): ViewConfig | undefined => {
  const { columns, source } = ctx;
  const viewCols = columns?.map((c) => columnForContext(c, 'view'));
  const uiBuilder = node
    ? (cols: typeof columns) => buildFormUiSchemaFromLayout(node as LayoutNode, cols, ctx.warn)
    : buildFormUiSchema;

  return buildView(source, viewCols, (c) => !c.hiddenInView, uiBuilder, true, undefined, ctx.resourceName);
};
