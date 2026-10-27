import type { UISchemaElement } from '@jsonforms/core';

import type { LayoutControl, LayoutNode } from './schema';
import { isComponentControl, isComponentItem, isNodeItem } from './schema';
import type { ControlOption } from '../layout/control.builder';
import { LayoutBuilder } from '../layout/layout.builder';
import { LayoutType } from '../layout/layout.options';
import type { JsonColumn } from '../resource/Column';
import { buildConditionSchema, buildFormControl } from '../schema/column/form-control';

const buildContainerForNode = (node: LayoutNode): LayoutBuilder => {
  const type = node.type ?? 'grid';
  let builder: LayoutBuilder;
  switch (type) {
    case 'collapse':
      builder = LayoutBuilder.collapse();
      if (node.title) builder.title(node.title);
      if (node.titleKey) builder.titleKey(node.titleKey);
      break;
    case 'group':
      builder = LayoutBuilder.group();
      if (node.title) builder.title(node.title);
      if (node.titleKey) builder.titleKey(node.titleKey);
      break;
    case 'horizontal':
      builder = LayoutBuilder.horizontal();
      break;
    case 'vertical':
      builder = LayoutBuilder.vertical();
      break;
    default:
      builder = LayoutBuilder.grid(node.columns);
  }
  if (node.colspan !== undefined) builder.colspan(node.colspan);
  if (node.rowspan !== undefined) builder.rowspan(node.rowspan);
  if (node.label) builder.label(node.label);
  return builder;
};

const resolveControlId = (ctrl: LayoutControl): string | null => {
  if (typeof ctrl === 'string') return ctrl;
  if (isComponentControl(ctrl)) return null;
  return ctrl.id;
};

const applyControlOverrides = (
  base: ReturnType<typeof buildFormControl>,
  ctrl: LayoutControl,
): ReturnType<typeof buildFormControl> => {
  if (typeof ctrl === 'string' || isComponentControl(ctrl)) return base;
  if (ctrl.colspan !== undefined) base.colspan(ctrl.colspan);
  if (ctrl.rowspan !== undefined) base.rowspan(ctrl.rowspan);
  if (ctrl.width !== undefined) base.width(ctrl.width);
  if (ctrl.label !== undefined) base.label(ctrl.label);
  if (ctrl.hideLabel) base.hideLabel();
  if (ctrl.type !== undefined) {
    base.control(ctrl.type, ctrl.options as Partial<ControlOption>);
  } else if (ctrl.options !== undefined) {
    // ponytail: shallow merge — styles deep-merge not needed yet
    base.opt(ctrl.options as Partial<ControlOption>);
  }
  // disabled/disabledWhen go into options so the rule slot stays free for show/hide
  if (ctrl.disabled !== undefined) base.opt({ disabled: ctrl.disabled });
  if (ctrl.disabledWhen) base.opt({ disabledWhen: ctrl.disabledWhen });
  if (ctrl.showWhen) {
    base.showWhen(
      `#/properties/${ctrl.showWhen.field}`,
      buildConditionSchema(ctrl.showWhen),
    );
  } else if (ctrl.hideWhen) {
    base.hideWhen(
      `#/properties/${ctrl.hideWhen.field}`,
      buildConditionSchema(ctrl.hideWhen),
    );
  }
  return base;
};

const buildNodeInto = (
  node: LayoutNode,
  colMap: Map<string, JsonColumn>,
  warn: (msg: string) => void,
  seenIds: Set<string>,
): LayoutBuilder => {
  const container = buildContainerForNode(node);

  // Single items list: components, field controls, nested nodes — in declared order
  for (const item of (node.items ?? [])) {
    if (isComponentItem(item)) {
      const ctrl = item;
      container.addControl({
        build: () => ({
          type: LayoutType.ComponentElement,
          options: {
            component: ctrl.component,
            ...(ctrl.colspan !== undefined && { colspan: ctrl.colspan }),
            ...(ctrl.rowspan !== undefined && { rowspan: ctrl.rowspan }),
            ...(ctrl.width !== undefined && { width: ctrl.width }),
            ...(ctrl.label !== undefined && { label: ctrl.label }),
          },
        }),
      });
      continue;
    }
    if (isNodeItem(item)) {
      const child = buildNodeInto(item as LayoutNode, colMap, warn, seenIds);
      container.addControl(child);
      continue;
    }
    // Field id or field control
    const ctrl = item as LayoutControl;
    const id = resolveControlId(ctrl)!;
    const col = colMap.get(id);
    if (!col) {
      warn(`layout: unknown or hidden column id "${id}" — skipping`);
      continue;
    }
    seenIds.add(id);
    const control = buildFormControl(col);
    container.addControl(applyControlOverrides(control, ctrl));
  }

  return container;
};

/**
 * Build a form/view UI schema from an author-declared layout node tree.
 * Falls back to source-order grid for any visible columns not referenced.
 */
export const buildFormUiSchemaFromLayout = (
  node: LayoutNode,
  cols: JsonColumn[],
  warn: (msg: string) => void = console.warn,
): UISchemaElement => {
  const colMap = new Map(cols.map((c) => [c.id, c]));
  const seenIds = new Set<string>();

  const root = buildNodeInto(node, colMap, warn, seenIds);
  return root.build();
};

/** Flatten the layout node tree depth-first into an ordered list of all leaf items (fields + components). */
export const flattenLayoutItems = (node: LayoutNode): LayoutControl[] => {
  const result: LayoutControl[] = [];
  const visit = (n: LayoutNode): void => {
    for (const item of (n.items ?? [])) {
      if (isNodeItem(item)) visit(item as LayoutNode);
      else result.push(item as LayoutControl);
    }
  };
  visit(node);
  return result;
};

/** @deprecated Use `flattenLayoutItems` */
export const flattenLayoutControls = flattenLayoutItems;

/**
 * Flatten the layout node tree depth-first into an ordered list of column ids only.
 * Used by the table ordering step when component controls are not needed.
 */
export const flattenLayoutControlIds = (
  node: LayoutNode,
  warn: (msg: string) => void = console.warn,
): string[] => {
  const ids: string[] = [];
  for (const ctrl of flattenLayoutItems(node)) {
    if (isComponentControl(ctrl)) continue;
    const id = resolveControlId(ctrl)!;
    if (
      typeof ctrl !== 'string' &&
      (ctrl.colspan !== undefined || ctrl.rowspan !== undefined)
    ) {
      warn(
        `layout: colspan/rowspan on table control "${id}" — ignored, table is flat`,
      );
    }
    ids.push(id);
  }
  return ids;
};
