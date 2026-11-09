import { buildFormUiSchema, buildFormUiSchemaFromLayout } from '../../view';
import { collectNodeFieldIds } from '../resolve/context-layout';
import type { FormLayoutNode, LayoutNode } from '../schema/LayoutNode.schema';
import type { LayoutBuildContext, ViewConfig } from './layout-builder.types';
import { applyRequiredColumns, buildView } from './view-helpers';

/**
 * Build the form view (create/edit) for a resource.
 * `node` is the explicit `layout.form` (undefined when absent). Visibility comes
 * from `ctx.fieldIds.form` — the resolved layout items, or the ids synthesized
 * from column flags. `hiddenInForm` is never read here.
 */
export const buildFormLayout = (
  node: FormLayoutNode | undefined,
  ctx: LayoutBuildContext,
): ViewConfig | undefined => {
  const { columns, source } = ctx;
  const fieldIds =
    ctx.fieldIds?.form ?? collectNodeFieldIds(node as LayoutNode | undefined, 'form');

  const hasExplicitItems =
    collectNodeFieldIds(node as LayoutNode | undefined, 'form').size > 0;
  const uiBuilder =
    node && hasExplicitItems
      ? (cols: typeof columns) =>
          buildFormUiSchemaFromLayout(node as LayoutNode, cols, ctx.warn)
      : buildFormUiSchema;

  const form = buildView(
    source,
    columns,
    (c) => fieldIds.has(c.id),
    uiBuilder,
    !hasExplicitItems, // sort by position only when no explicit layout (layout order wins)
    (c) =>
      !c.idField &&
      fieldIds.has(c.id) &&
      (c.createable === true || c.updateable === true),
    ctx.resourceName,
  );
  if (form) applyRequiredColumns(form.data as Record<string, unknown>, columns);
  return form;
};
