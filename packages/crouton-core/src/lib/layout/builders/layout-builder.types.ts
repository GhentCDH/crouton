import type { JsonColumn } from '../../resource/Column';
import type { ViewConfig } from '../../schema/view/view.schema';
import type { LayoutKind } from '../resolve/context-layout';

/**
 * A function that takes a set of columns and produces the JSON Schema object
 * for a view. Two implementations exist: zodSchemaSource (Prisma resources) and
 * columnTypeSchemaSource (custom resources / no schema).
 */
export type ViewJsonSchemaSource = (schemaCols: JsonColumn[]) => Record<string, unknown> | undefined;

/**
 * Per-context field ids resolved by the layout layer: the explicit `layout.<kind>`
 * items when present, otherwise the ids synthesized from the column flags.
 * Builders filter on this set — they never read `hiddenIn*` themselves.
 */
export type LayoutVisibility = Partial<Record<LayoutKind, Set<string>>>;

/**
 * Shared context passed to every layout builder.
 * `fieldIds` carries the resolved visibility; `columns` are the authored columns.
 */
export type LayoutBuildContext = {
  columns: JsonColumn[];
  source: ViewJsonSchemaSource;
  warn: (msg: string) => void;
  /** Resource name/route — used to auto-generate labelKey on ViewColumnConfig columns. */
  resourceName?: string;
  fieldIds?: LayoutVisibility;
};

export type { ViewConfig };
