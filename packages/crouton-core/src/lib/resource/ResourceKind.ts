import { z } from 'zod';

/**
 * Where a resource's data comes from.
 *
 * - `prisma` — the default. Backed by a Prisma model (`model` is required) and
 *   a Zod model schema in `schema.ts`. The framework generates the whole data
 *   access layer.
 * - `custom` — configuration only. There is no Prisma model and no
 *   `schema.ts`; the JSON model is assembled from the column `type`s, and the
 *   developer implements the operations in a sibling `repository.ts`.
 */
export const ResourceKindSchema = z
  .enum(['prisma', 'custom'])
  .default('prisma')
  .describe(
    'Where the resource\'s data comes from. ' +
    '"prisma" (default) is backed by a Prisma model and a schema.ts; ' +
    '"custom" is configuration-only — supply a repository.ts and use the data source "adapter" field for non-Prisma sources. ' +
    'Use "custom" only for config-only resources; for a non-Prisma data source prefer the data source adapter instead.',
  );

export type ResourceKind = z.infer<typeof ResourceKindSchema>;

/** `true` when the resource's data access is supplied by a user `repository.ts`. */
export const isCustomKind = (kind: ResourceKind | undefined): boolean =>
  kind === 'custom';
