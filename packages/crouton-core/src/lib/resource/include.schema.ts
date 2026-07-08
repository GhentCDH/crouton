import { z } from 'zod';

// ── Include ───────────────────────────────────────────────────────────

/**
 * A single entry in an `include` list.
 * - Plain string: `"author"` → `{ author: true }`
 * - Object with nested includes: `{ relation: "text_author", include: ["author"] }`
 *   → `{ text_author: { include: { author: true } } }`
 * - Object with orderBy: `{ relation: "sections", orderBy: { title: "asc" } }`
 *   → `{ sections: { orderBy: { title: "asc" } } }`
 */
export const JsonIncludeEntrySchema: z.ZodType<any> = z.lazy(() =>
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

export type JsonIncludeEntry = z.infer<typeof JsonIncludeEntrySchema>;
