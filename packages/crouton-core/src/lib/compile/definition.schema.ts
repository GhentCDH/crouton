import { z } from 'zod';

import { SecuritySchema } from '../data-source/Security.schema';

import { SchemaInputSchema } from './schema-input';

export type { JsonSchemaInput, SchemaInput } from './schema-input';

const OperationDefSchema = z.union([
  z.literal(true),
  z.object({
    schema: SchemaInputSchema.optional(),
    security: SecuritySchema.optional(),
  }),
]);

export type OperationDef = z.infer<typeof OperationDefSchema>;

const UpsertOperationDefSchema = z.object({
  schema: SchemaInputSchema.optional(),
  upsertOn: z.union([z.string(), z.array(z.string())]),
  security: SecuritySchema.optional(),
});

export type UpsertOperationDef = z.infer<typeof UpsertOperationDefSchema>;
export type PatchOperationDef = z.infer<typeof OperationDefSchema>;

export const ResourceDefinitionSchema = z.object({
  findAll: OperationDefSchema.optional(),
  findOne: OperationDefSchema.optional(),
  create: OperationDefSchema.optional(),
  update: OperationDefSchema.optional(),
  patch: OperationDefSchema.optional(),
  upsert: UpsertOperationDefSchema.optional(),
  delete: OperationDefSchema.optional(),
});

export type ResourceDefinition = z.infer<typeof ResourceDefinitionSchema>;

const DefinitionCallbackSchema = z.function({
  input: [],
  output: ResourceDefinitionSchema,
});

export type DefinitionCallback = () => ResourceDefinition;

export const DefinitionSchema = z.union([
  ResourceDefinitionSchema,
  DefinitionCallbackSchema,
]);
