import type { JsonColumn } from '../../resource/Column';
import type { ViewConfig } from '../../view/view.schema';

/**
 * A function that takes a set of columns and produces the JSON Schema object
 * for a view. Two implementations exist: zodSchemaSource (Prisma resources) and
 * columnTypeSchemaSource (custom resources / no schema).
 */
export type ViewJsonSchemaSource = (schemaCols: JsonColumn[]) => Record<string, unknown> | undefined;

/**
 * Shared context passed to every layout builder.
 * Columns have already had visibility resolved (effective hiddenIn* flags).
 */
export type LayoutBuildContext = {
  columns: JsonColumn[];
  source: ViewJsonSchemaSource;
  warn: (msg: string) => void;
  /** Resource name/route — used to auto-generate labelKey on ViewColumnConfig columns. */
  resourceName?: string;
};

export type { ViewConfig };
