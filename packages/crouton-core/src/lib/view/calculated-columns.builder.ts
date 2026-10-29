import type { CalculatedColumn } from '../resource/CalculatedColumn.schema';
import type { ViewColumnConfig, ViewConfig } from '../schema/view/view.schema';


// ── Calculated column injection ───────────────────────────────────────────

type InjectionMode = 'table' | 'view';

/**
 * When the rendering context has an explicit layout, calculated columns are
 * placed by their position in the layout's field-id order. Without one they
 * keep the flag-driven (`hiddenIn*`) + `position` fallback.
 */
export type CalculatedPlacement = { order: string[] };

const isVisibleInMode = (c: CalculatedColumn, mode: InjectionMode): boolean =>
  mode === 'table' ? !c.hiddenInTable : !c.hiddenInView;

const buildCalculatedElement = (c: CalculatedColumn, mode: InjectionMode) =>
  mode === 'table'
    ? {
        type: c.type === 'boolean' ? 'BooleanCell' : 'TextCell',
        scope: `#/properties/${c.id}`,
        options: {
          label: c.label ?? c.id,
        },
      }
    : {
        type: 'Control',
        scope: `#/properties/${c.id}`,
        options: {
          // Spread fieldInput.options first (e.g. colspan), then layer type-derived options on top.
          ...(c.fieldInput?.options ?? {}),
          label: c.label ?? c.id,
          ...(c.type === 'boolean' && { format: 'boolean' }),
        },
      };

/**
 * Effective insertion position for a calculated column.
 * `fieldInput.position` takes precedence over top-level `position`.
 * `undefined` means append to the end.
 */
const calcPosition = (c: CalculatedColumn): number | undefined =>
  c.fieldInput?.position ?? c.position;

const injectCalculatedColumnsIntoView = (
  viewConfig: ViewConfig,
  calculated: CalculatedColumn[],
  mode: InjectionMode,
  placement?: CalculatedPlacement,
): ViewConfig => {
  if (!calculated.length) return viewConfig;

  const indexOf = placement
    ? new Map(placement.order.map((id, i) => [id, i]))
    : undefined;

  const visible = indexOf
    ? calculated.filter((c) => indexOf.has(c.id))
    : calculated.filter((c) => isVisibleInMode(c, mode));
  if (!visible.length) return viewConfig;

  const positionOf = (c: CalculatedColumn): number =>
    indexOf ? indexOf.get(c.id)! : (calcPosition(c) ?? Infinity);

  const jsonSchema = { ...(viewConfig.data ?? {}) } as Record<string, unknown>;
  jsonSchema['properties'] = { ...(jsonSchema['properties'] as Record<string, unknown>) };
  const props = jsonSchema['properties'] as Record<string, unknown>;
  for (const c of visible) {
    props[c.id] = {
      type: c.type === 'boolean' ? 'boolean' : 'string',
      title: c.label ?? c.id,
    };
  }

  const uiSchema = { ...(viewConfig.ui ?? {}) } as Record<string, unknown>;
  const existing: Record<string, unknown>[] = [...((uiSchema['elements'] as Record<string, unknown>[] | undefined) ?? [])];

  const elementId = (el: Record<string, unknown>): string | undefined =>
    (el['scope'] as string | undefined)?.replace('#/properties/', '');

  // Merge-sort existing elements with calculated elements. Existing elements not
  // referenced by the layout order fall back to their slot (`index + 0.5`), which
  // means `position: N` slots a calculated column before the element at index N.
  const tagged: Array<{ el: Record<string, unknown>; pos: number }> = [
    ...existing.map((el, i) => {
      const id = indexOf ? elementId(el) : undefined;
      const pos = id !== undefined && indexOf!.has(id) ? indexOf!.get(id)! : i + 0.5;
      return { el, pos };
    }),
    ...visible.map((c) => ({
      el: buildCalculatedElement(c, mode),
      pos: positionOf(c),
    })),
  ];
  tagged.sort((a, b) => a.pos - b.pos);
  uiSchema.elements = tagged.map((t) => t.el);

  // Insert new ViewColumnConfig entries at the same relative position.
  const columns = [...viewConfig.columns];
  for (const c of visible) {
    const pos = indexOf ? indexOf.get(c.id)! : calcPosition(c);
    const entry: ViewColumnConfig = { id: c.id, label: c.label };
    if (pos !== undefined) {
      columns.splice(pos, 0, entry);
    } else {
      columns.push(entry);
    }
  }

  return {
    ...viewConfig,
    data: jsonSchema,
    ui: uiSchema,
    columns,
  };
};

/** Inject calculated columns into a table ViewConfig (TextCell/BooleanCell elements). */
export const injectCalculatedColumns = (
  tableView: ViewConfig,
  calculated: CalculatedColumn[],
  placement?: CalculatedPlacement,
): ViewConfig =>
  injectCalculatedColumnsIntoView(tableView, calculated, 'table', placement);

/** Inject calculated columns into a form/view ViewConfig (Control elements). */
export const injectCalculatedColumnsToView = (
  viewConfig: ViewConfig,
  calculated: CalculatedColumn[],
  placement?: CalculatedPlacement,
): ViewConfig =>
  injectCalculatedColumnsIntoView(viewConfig, calculated, 'view', placement);

