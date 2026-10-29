import type { LayoutBuildContext, ViewConfig } from './layout-builder.types';
import { buildView } from './view-helpers';
import {
  buildFormUiSchema,
  buildFormUiSchemaFromLayout,
  columnForContext,
} from '../../view';
import { collectNodeFieldIds } from '../resolve/context-layout';
import type { FormLayoutNode, LayoutNode } from '../schema';

/**
 * Build the detail (read-only) view for a resource.
 * `node` is the explicit `layout.view` (undefined when absent). Visibility comes
 * from `ctx.fieldIds.view` — the resolved layout items, or the ids synthesized
 * from column flags. `hiddenInView` is never read here.
 */
export const buildViewLayout = (
  node: FormLayoutNode | undefined,
  ctx: LayoutBuildContext,
): ViewConfig | undefined => {
  const { columns, source } = ctx;
  const viewCols = columns?.map((c) => columnForContext(c, 'view'));
  const fieldIds =
    ctx.fieldIds?.view ?? collectNodeFieldIds(node as LayoutNode | undefined, 'view');

  const uiBuilder = node
    ? (cols: typeof columns) =>
        buildFormUiSchemaFromLayout(node as LayoutNode, cols, ctx.warn)
    : buildFormUiSchema;

  return buildView(
    source,
    viewCols,
    (c) => fieldIds.has(c.id),
    uiBuilder,
    true,
    undefined,
    ctx.resourceName,
  );
};
