import { z } from 'zod';

import { SecuritySchema } from './Security.schema';

// ── Operations ────────────────────────────────────────────────────────

/** A standard operation entry: plain boolean or an object with optional security. */
const OpEntry = z.union([
  z.boolean(),
  z.object({ security: SecuritySchema.optional() }),
]);

const BoolOrUpsertSchema = z.union([
  z.boolean(),
  z.object({
    upsertOn: z.union([z.string(), z.array(z.string())]),
    security: SecuritySchema.optional(),
  }),
]);

export const JsonOperationsSchema = z.object({
  findAll: OpEntry.default(true), // default: true — only explicit `false` disables it
  findOne: OpEntry.default(true), // default: true
  create: OpEntry.default(true), // default: true
  update: OpEntry.default(true), // default: true
  patch: OpEntry.default(true), // default: true
  upsert: BoolOrUpsertSchema.default(false), // default: disabled; `true` throws at load time — must be `{ upsertOn }`
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
