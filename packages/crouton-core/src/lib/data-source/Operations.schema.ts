import { z } from 'zod';

import { SecuritySchema } from './Security.schema';
import { JsonIncludeEntrySchema } from '../resource/include.schema';

// ── Operations ────────────────────────────────────────────────────────

const ExternalOpEntry = z.object({
  uri: z.string().describe('Full URL of the external API endpoint that handles this operation.'),
  method: z.string().optional().describe('HTTP method for the external endpoint. Defaults to the standard method for each operation.'),
  security: SecuritySchema.optional().describe('Security override for this specific external operation.'),
});

export type ExternalOpEntry = z.infer<typeof ExternalOpEntry>;

const IncludeField = {
  include: z.array(JsonIncludeEntrySchema).optional().describe('Prisma relations to eager-load for this operation.'),
};

const OpEntry = z.union([
  z.boolean(),
  ExternalOpEntry,
  z.object({
    security: SecuritySchema.optional().describe('Security override for this specific operation. Overrides the resource-level global security block.'),
    ...IncludeField,
  }),
]);

const FindAllOpEntry = z.union([
  z.boolean(),
  ExternalOpEntry.extend({
    search: z.array(z.string()).optional().describe('Column ids (or dot paths) that ?q= matches.'),
    filter: z.array(z.string()).optional().describe('Optional allowlist of filter fields the server accepts.'),
    ...IncludeField,
  }),
  z.object({
    security: SecuritySchema.optional().describe('Security override for this specific operation. Overrides the resource-level global security block.'),
    search: z.array(z.string()).optional().describe('Column ids (or dot paths) that ?q= matches.'),
    filter: z.array(z.string()).optional().describe('Optional allowlist of filter fields the server accepts.'),
    ...IncludeField,
  }),
]);

export const JsonOperationsSchema = z.object({
  findAll: FindAllOpEntry.default(true).describe('GET collection endpoint. true = enabled, false = disabled, object = external URI or security override.'),
  findOne: OpEntry.default(true).describe('GET single record endpoint. true = enabled, false = disabled, object = external URI or security override.'),
  create: OpEntry.default(true).describe('POST create endpoint. true = enabled, false = disabled, object = external URI or security override.'),
  update: OpEntry.default(true).describe('PUT full-update endpoint. true = enabled, false = disabled, object = external URI or security override.'),
  patch: OpEntry.default(true).describe('PATCH partial-update endpoint. true = enabled, false = disabled, object = external URI or security override.'),
  delete: OpEntry.default(true).describe('DELETE endpoint. true = enabled, false = disabled, object = external URI or security override.'),
});

export type JsonResourceOperations = z.infer<typeof JsonOperationsSchema>;
export type JsonResourceOperationsInput = z.input<typeof JsonOperationsSchema>;

export const extractFindAllSearch = (findAll: JsonResourceOperations['findAll']): string[] | undefined => {
  if (typeof findAll !== 'object' || findAll === null) return undefined;
  return (findAll as { search?: string[] }).search;
};

export const extractOpInclude = (op: unknown): z.infer<typeof JsonIncludeEntrySchema>[] | undefined => {
  if (typeof op !== 'object' || op === null) return undefined;
  const include = (op as Record<string, unknown>)['include'];
  return Array.isArray(include) ? (include as z.infer<typeof JsonIncludeEntrySchema>[]) : undefined;
};

/**
 * Build an operations map for a sub-resource with full URIs.
 * `baseUri` is the collection endpoint, e.g. `http://host/text/{id}/content`.
 */
export const buildSubResourceOperations = (
  ops: JsonResourceOperations | undefined,
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
