import { z } from 'zod';

import { SchemaInputSchema } from './json.schema';

const OperationDefSchema = z.union([
  z.literal(true),
  z.object({
    schema: SchemaInputSchema.optional(),
  }),
]);

export type OperationDef = z.infer<typeof OperationDefSchema>;

const UpsertOperationDefSchema = z.object({
  schema: SchemaInputSchema.optional(),
  upsertOn: z.union([z.string(), z.array(z.string())]),
});

export type UpsertOperationDef = z.infer<typeof UpsertOperationDefSchema>;

export const ResourceDefinitionSchema = z.object({
  findAll: OperationDefSchema.optional(),
  findOne: OperationDefSchema.optional(),
  create: OperationDefSchema.optional(),
  update: OperationDefSchema.optional(),
  upsert: UpsertOperationDefSchema.optional(),
  delete: OperationDefSchema.optional(),
});

export type ResourceDefinition = z.infer<typeof ResourceDefinitionSchema>;

// Functions aren't representable as data schemas — validate shape only if needed.
const DefinitionCallbackSchema = z.function({
  input: [],
  output: ResourceDefinitionSchema,
});

export type DefinitionCallback = () => ResourceDefinition;


export const DefinitionSchema = z.union([ResourceDefinitionSchema, DefinitionCallbackSchema])
