import { z } from 'zod';

import { SecuritySchema } from './Security.schema';

// ── Operations ────────────────────────────────────────────────────────

/** An operation served by an external API instead of crouton. */
const ExternalOpEntry = z.object({
  uri: z.string(),
  method: z.string().optional(),
  security: SecuritySchema.optional(),
});

export type ExternalOpEntry = z.infer<typeof ExternalOpEntry>;

/** A standard operation entry: plain boolean, external route object, or security config. */
const OpEntry = z.union([
  z.boolean(),
  ExternalOpEntry,
  z.object({ security: SecuritySchema.optional() }),
]);

export const JsonOperationsSchema = z.object({
  findAll: OpEntry.default(true), // default: true — only explicit `false` disables it
  findOne: OpEntry.default(true), // default: true
  create: OpEntry.default(true), // default: true
  update: OpEntry.default(true), // default: true
  patch: OpEntry.default(true), // default: true
  delete: OpEntry.default(true), // default: true
});

export type JsonResourceOperations = z.infer<typeof JsonOperationsSchema>;
export type JsonResourceOperationsInput = z.input<typeof JsonOperationsSchema>;

/**
 * Build an operations map for a sub-resource with full URIs.
 * `baseUri` is the collection endpoint, e.g. `http://host/text/{id}/content`.
 */
export const buildSubResourceOperations = (
  ops:
    | Partial<
        Record<
          'findAll' | 'findOne' | 'create' | 'update' | 'patch' | 'delete',
          boolean
        >
      >
    | undefined,
  baseUri: string,
  idField = 'id',
): Record<string, unknown> => {
  if (!ops) return {};
  const idPlaceholder = `{${idField}}`;
  return {
    ...(ops.findAll && { findAll: { uri: baseUri, method: 'get' } }),
    ...(ops.findOne && {
      findOne: { uri: `${baseUri}/${idPlaceholder}`, method: 'get' },
    }),
    ...(ops.create && { create: { uri: baseUri, method: 'post' } }),
    ...(ops.update && {
      update: { uri: `${baseUri}/${idPlaceholder}`, method: 'put' },
    }),
    ...(ops.patch && {
      patch: { uri: `${baseUri}/${idPlaceholder}`, method: 'patch' },
    }),
    ...(ops.delete && {
      delete: { uri: `${baseUri}/${idPlaceholder}`, method: 'delete' },
    }),
  };
};
