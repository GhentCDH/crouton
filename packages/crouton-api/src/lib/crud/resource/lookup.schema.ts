export const LookupSchema = z.object({
  /** The primary key field name (used for id-based lookups). */
  key: z.string(),
  /**
   * Primary display field for autocomplete dropdowns.
   * Derived from the first `showInLookup` or `searchable` column.
   */
  label: z.string().optional(),
  /**
   * All searchable field paths for `?q=` OR search.
   * manyToOne relation columns are resolved to `relation.displayField` (e.g. `author.name`).
   */
  labels: z.array(z.string()).optional(),
});
import { z } from 'zod';

export type LookupConfig = z.infer<typeof LookupSchema>;
