import { buildFormControl } from './form-schema.builder';
import { LayoutBuilder } from '../layout/layout.builder';
import type { JsonColumn } from '../resource/Column';
import type { LayoutControl, LayoutNode } from '../resource/Layout.schema';

const buildContainerForNode = (node: LayoutNode): LayoutBuilder<any> => {
  const type = node.type ?? 'grid';
  let builder: LayoutBuilder<any>;
  switch (type) {
    case 'collapse':
      builder = LayoutBuilder.collapse<any>();
      if (node.title) builder.title(node.title);
      if (node.titleKey) builder.titleKey(node.titleKey);
      break;
    case 'group':
      builder = LayoutBuilder.group<any>();
      if (node.title) builder.title(node.title);
      if (node.titleKey) builder.titleKey(node.titleKey);
      break;
    case 'horizontal':
      builder = LayoutBuilder.horizontal<any>();
      break;
    case 'vertical':
      builder = LayoutBuilder.vertical<any>();
      break;
    default:
      builder = LayoutBuilder.grid<any>(node.columns);
  }
  if (node.colspan !== undefined) builder.colspan(node.colspan);
  if (node.rowspan !== undefined) builder.rowspan(node.rowspan);
  if (node.label) builder.label(node.label);
  return builder;
};

const resolveControlId = (ctrl: LayoutControl): string =>
  typeof ctrl === 'string' ? ctrl : ctrl.id;

const applyControlOverrides = (
  base: ReturnType<typeof buildFormControl>,
  ctrl: LayoutControl,
): ReturnType<typeof buildFormControl> => {
  if (typeof ctrl === 'string') return base;
  if (ctrl.colspan !== undefined) base.colspan(ctrl.colspan);
  if (ctrl.rowspan !== undefined) base.rowspan(ctrl.rowspan);
  if (ctrl.width !== undefined) base.width(ctrl.width as any);
  if (ctrl.label !== undefined) base.label(ctrl.label);
  if (ctrl.hideLabel) base.hideLabel();
  if (ctrl.type !== undefined || ctrl.options !== undefined) {
    base.control(ctrl.type ?? 'text', ctrl.options as any);
  }
  return base;
};

const buildNodeInto = (
  node: LayoutNode,
  colMap: Map<string, JsonColumn>,
  warn: (msg: string) => void,
  seenIds: Set<string>,
): LayoutBuilder<any> => {
  const container = buildContainerForNode(node);

  // Controls first, then nested items
  if (node.controls?.length) {
    for (const ctrl of node.controls) {
      const id = resolveControlId(ctrl);
      const col = colMap.get(id);
      if (!col) {
        warn(`layout: unknown or hidden column id "${id}" — skipping`);
        continue;
      }
      if (typeof ctrl !== 'string') {
        if (ctrl.colspan !== undefined && (ctrl as any).rowspan !== undefined) {
          // table context: warn on span overrides
        }
      }
      seenIds.add(id);
      const control = buildFormControl(col);
      container.addControl(applyControlOverrides(control, ctrl));
    }
  }

  if (node.items?.length) {
    for (const item of node.items) {
      const child = buildNodeInto(item, colMap, warn, seenIds);
      container.addControl(child);
    }
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
): Record<string, unknown> => {
  const colMap = new Map(cols.map((c) => [c.id, c]));
  const seenIds = new Set<string>();

  const root = buildNodeInto(node, colMap, warn, seenIds);

  // Append unreferenced columns to preserve backward-compat
  const unreferenced = cols.filter((c) => !seenIds.has(c.id));
  if (unreferenced.length) {
    for (const col of unreferenced) {
      warn(`layout: column "${col.id}" not referenced in layout — appending`);
      root.addControl(buildFormControl(col));
    }
  }

  return root.build() as unknown as Record<string, unknown>;
};

/**
 * Flatten the layout node tree depth-first into an ordered list of control ids.
 * Used by the table ordering step.
 */
export const flattenLayoutControlIds = (node: LayoutNode): string[] => {
  const ids: string[] = [];
  const visit = (n: LayoutNode): void => {
    for (const ctrl of n.controls ?? []) {
      const id = typeof ctrl === 'string' ? ctrl : ctrl.id;
      if (typeof ctrl !== 'string') {
        const c = ctrl as { colspan?: number; rowspan?: number };
        if ((c.colspan !== undefined || c.rowspan !== undefined)) {
          // ponytail: span on table controls silently ignored — table is flat
        }
      }
      ids.push(id);
    }
    for (const item of n.items ?? []) visit(item);
  };
  visit(node);
  return ids;
};
