export const LookupSchema = z.object({
  /** The primary key field name (used for id-based lookups). */
  key: z.string(),
  /**
   * The field used for text search (`?q=`). When absent, `?q=` is silently ignored.
   * Derived from the first `showInLookup` column, then first `searchable` column.
   */
  label: z.string().optional(),
});
import { z } from 'zod';

export type LookupConfig = z.infer<typeof LookupSchema>;
