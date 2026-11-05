import { z } from 'zod';

// ── Include ───────────────────────────────────────────────────────────

/**
 * A single entry in an `include` list.
 * - Plain string: `"author"` → `{ author: true }`
 * - Dot-path string: `"author.books"` → `{ author: { include: { books: true } } }`.
 *   Multiple entries for the same top-level relation are deep-merged.
 * - Object with nested includes: `{ relation: "sections", include: ["author"] }`
 *   → `{ sections: { include: { author: true } } }`
 * - Object with orderBy: `{ relation: "sections", orderBy: { title: "asc" } }`
 *   → `{ sections: { orderBy: { title: "asc" } } }`
 *
 * The object form and dot-path strings for the same relation are merged:
 * `["a.b", { "relation": "a", "orderBy": { "position": "asc" } }]`
 * → `{ a: { include: { b: true }, orderBy: { position: "asc" } } }`
 */
export type JsonIncludeEntry =
  | string
  | { relation: string; include?: JsonIncludeEntry[]; orderBy?: Record<string, unknown> };

// z.ZodType<JsonIncludeEntry> needed for the recursive self-reference
export const JsonIncludeEntrySchema: z.ZodType<JsonIncludeEntry> = z.lazy(() =>
  z.union([
    z.string(), // plain relation name → `{ [name]: true }`
    z.object({
      relation: z.string(), // required
      include: z.array(JsonIncludeEntrySchema).optional(), // nested includes;
      /** Prisma-format orderBy clause applied to the included records. */
      orderBy: z.record(z.string(), z.unknown()).optional(),
    }),
  ]),
);
