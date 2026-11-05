import type { CalculatedPlacement } from '../layout/resolve/calculated-placement';
import type { CalculatedColumn } from '../resource/CalculatedColumn.schema';
import type { ViewConfig } from '../schema/view/view.schema';


// ── Calculated column injection ───────────────────────────────────────────

type InjectionMode = 'table' | 'view';

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
 * Inject calculated columns into a view.
 *
 * `placement.order` is the context's resolved field-id order (see
 * `resolveCalculatedPlacement`): a calculated column appears exactly when its id
 * is in the order, positioned by its index there. Visibility flags are never read
 * here — the layout layer already resolved them.
 */
const injectCalculatedColumnsIntoView = (
  viewConfig: ViewConfig,
  calculated: CalculatedColumn[],
  mode: InjectionMode,
  placement: CalculatedPlacement,
): ViewConfig => {
  if (!calculated.length) return viewConfig;

  const indexOf = new Map(placement.order.map((id, i) => [id, i]));
  const visible = calculated.filter((c) => indexOf.has(c.id));
  if (!visible.length) return viewConfig;

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

  // Order every element by its index in the resolved order; elements the order
  // does not name (e.g. component cells) keep their slot.
  const tagged: Array<{ el: Record<string, unknown>; pos: number }> = [
    ...existing.map((el, i) => {
      const id = elementId(el);
      return { el, pos: id !== undefined && indexOf.has(id) ? indexOf.get(id)! : i + 0.5 };
    }),
    ...visible.map((c) => ({
      el: buildCalculatedElement(c, mode),
      pos: indexOf.get(c.id)!,
    })),
  ];
  tagged.sort((a, b) => a.pos - b.pos);
  uiSchema.elements = tagged.map((t) => t.el);

  // Insert new ViewColumnConfig entries at the same relative position.
  const columns = [...viewConfig.columns];
  for (const c of visible) {
    columns.splice(indexOf.get(c.id)!, 0, { id: c.id, label: c.label });
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
  placement: CalculatedPlacement,
): ViewConfig =>
  injectCalculatedColumnsIntoView(tableView, calculated, 'table', placement);

/** Inject calculated columns into a form/view ViewConfig (Control elements). */
export const injectCalculatedColumnsToView = (
  viewConfig: ViewConfig,
  calculated: CalculatedColumn[],
  placement: CalculatedPlacement,
): ViewConfig =>
  injectCalculatedColumnsIntoView(viewConfig, calculated, 'view', placement);
