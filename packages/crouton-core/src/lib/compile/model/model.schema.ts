import { z } from 'zod';

import { EnumRegistrySchema } from '../enum-registry';

/**
 * Neutral, serializable representation of a resource's data model.
 *
 * Produced from a Zod schema (via toJsonSchema) or from Prisma DMMF (in crouton-codegen).
 * Core never imports Prisma. The model fills gaps in field resolution (stage 2.2);
 * an explicit column value always wins over the model.
 *
 * Internal for now — not published as a user-facing format.
 */
export const ModelPropertySchema = z.record(z.string(), z.unknown());

export const ModelRelationSchema = z.object({
  kind: z.enum(['manyToOne', 'oneToMany', 'manyToMany']),
  target: z.string(),
});

export const ModelSchema = z.object({
  properties: z.record(z.string(), ModelPropertySchema),
  required: z.array(z.string()).default([]),
  relations: z.record(z.string(), ModelRelationSchema).optional(),
});

export type ModelSchema = z.infer<typeof ModelSchema>;
export type ModelRelation = z.infer<typeof ModelRelationSchema>;

/**
 * A resource reachable via extends, a relation target, or a sub-resource target.
 * Only the raw resource.json and its optional model are captured — no interpretation.
 */
export const ResourceRefSchema = z.object({
  resource: z.unknown(),
  model: ModelSchema.optional(),
});

export type ResourceRef = z.infer<typeof ResourceRefSchema>;

/**
 * Everything normalizeResource needs — collected once by gatherInput before
 * normalization starts (Phase 2). Plain data, no callbacks.
 *
 * Keys in `refs` are resource route names (e.g. "authors", "books").
 */
export const ResourceInputSchema = z.object({
  resource: z.unknown(),
  model: ModelSchema.optional(),
  refs: z.record(z.string(), ResourceRefSchema).default({}),
  enums: EnumRegistrySchema,
  baseUrl: z.string().optional(),
});

export type ResourceInput = z.infer<typeof ResourceInputSchema>;
