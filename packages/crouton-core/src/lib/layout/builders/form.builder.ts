import type { LayoutBuildContext, ViewConfig } from './layout-builder.types';
import { applyRequiredColumns, buildView } from './view-helpers';
import { buildFormUiSchema, buildFormUiSchemaFromLayout } from '../../view';
import type { FormLayoutNode } from '../schema/LayoutNode.schema';
import type { LayoutNode } from '../schema/LayoutNode.schema';

/**
 * Build the form view (create/edit) for a resource.
 * When `node` is present it is the explicit layout; absent = column-flag fallback.
 */
export const buildFormLayout = (
  node: FormLayoutNode | undefined,
  ctx: LayoutBuildContext,
): ViewConfig | undefined => {
  const { columns, source } = ctx;
  const uiBuilder = node
    ? (cols: typeof columns) => buildFormUiSchemaFromLayout(node as LayoutNode, cols, ctx.warn)
    : buildFormUiSchema;

  const form = buildView(
    source,
    columns,
    (c) => !c.hiddenInForm,
    uiBuilder,
    true, // always sort by position; layout builder reorders via its node tree
    (c) =>
      !c.idField &&
      !c.hiddenInForm &&
      (c.createable === true || c.updateable === true),
    ctx.resourceName,
  );
  if (form) applyRequiredColumns(form.json_schema as Record<string, unknown>, columns);
  return form;
};
