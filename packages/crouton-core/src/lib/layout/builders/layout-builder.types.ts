import type { ZodObject, ZodRawShape } from 'zod';

import type { JsonColumn } from '../../resource/Column';
import type { ViewJsonSchemaSource } from '../../view/view.builder';
import type { Layout } from '../schema/layout.schema';

export type LayoutBuildContext = {
  /** Enriched columns (after visibility resolution). */
  columns: JsonColumn[] | undefined;
  /** JSON schema source: picks from Zod model (prisma) or assembles from column types (custom). */
  source: ViewJsonSchemaSource | undefined;
  /** Zod schema for the resource model (prisma only). */
  schema?: ZodObject<ZodRawShape>;
  /** The full layout object (used to resolve cross-context references, e.g. filterFields). */
  layout?: Layout;
};
