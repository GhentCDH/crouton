/** Resource draft produced by the `classify` stage. */

import type { ResourceJsonInput } from '@ghentcdh/crouton-core';

/**
 * A fully generated resource config (the "ideal" output for a model given the
 * current DB schema + ruleset). `diff` reconciles this against what's on disk.
 */
export interface ResourceDraft {
  /** Directory / route name. */
  name: string;
  /** Prisma model name (needed for the generated schema.ts export name). */
  prismaName: string;
  config: ResourceJsonInput;
  /**
   * Whether the model has any relation (object) fields. zod-prisma-types only
   * emits a `…WithRelationsSchema` for models that have relations, so the
   * generated `schema.ts` must fall back to the plain `…Schema` otherwise.
   */
  hasRelations: boolean;
  /** Column ids in generation order (columns map has no guaranteed order in JSON). */
  columnOrder: string[];
  /** Relations whose target resource does not (yet) exist — left hidden. */
  unwiredRelations: { field: string; targetModel: string }[];
}