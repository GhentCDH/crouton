import type { CalculatedColumn } from '../loader/json-config.types';
import type { ViewColumnConfig, ViewConfig } from '../crud.config';

// ── Calculated column injection ───────────────────────────────────────────

type InjectionMode = 'table' | 'view';

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
): ViewConfig => {
  if (!calculated.length) return viewConfig;

  const visible = calculated.filter((c) => isVisibleInMode(c, mode));
  if (!visible.length) return viewConfig;

  const jsonSchema = { ...(viewConfig.json_schema as any) };
  jsonSchema.properties = { ...jsonSchema.properties };
  for (const c of visible) {
    jsonSchema.properties[c.id] = {
      type: c.type === 'boolean' ? 'boolean' : 'string',
      title: c.label ?? c.id,
    };
  }

  const uiSchema = { ...(viewConfig.ui_schema as any) };
  const existing: any[] = [...(uiSchema.elements ?? [])];

  // Merge-sort existing elements (implicit position = index + 0.5) with calculated
  // elements (explicit position). Using i + 0.5 means `position: N` slots a calculated
  // column before the regular column currently at index N.
  const tagged: Array<{ el: any; pos: number }> = [
    ...existing.map((el, i) => ({ el, pos: i + 0.5 })),
    ...visible.map((c) => ({
      el: buildCalculatedElement(c, mode),
      pos: calcPosition(c) ?? Infinity,
    })),
  ];
  tagged.sort((a, b) => a.pos - b.pos);
  uiSchema.elements = tagged.map((t) => t.el);

  // Insert new ViewColumnConfig entries at the same relative position.
  const columns = [...viewConfig.columns];
  for (const c of visible) {
    const pos = calcPosition(c);
    const entry: ViewColumnConfig = { id: c.id, label: c.label };
    if (pos !== undefined) {
      columns.splice(pos, 0, entry);
    } else {
      columns.push(entry);
    }
  }

  return {
    ...viewConfig,
    json_schema: jsonSchema,
    ui_schema: uiSchema,
    columns,
  };
};

/** Inject calculated columns into a table ViewConfig (TextCell/BooleanCell elements). */
export const injectCalculatedColumns = (
  tableView: ViewConfig,
  calculated: CalculatedColumn[],
): ViewConfig =>
  injectCalculatedColumnsIntoView(tableView, calculated, 'table');

/** Inject calculated columns into a form/view ViewConfig (Control elements). */
export const injectCalculatedColumnsToView = (
  viewConfig: ViewConfig,
  calculated: CalculatedColumn[],
): ViewConfig =>
  injectCalculatedColumnsIntoView(viewConfig, calculated, 'view');