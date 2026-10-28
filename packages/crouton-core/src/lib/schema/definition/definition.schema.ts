import { z } from 'zod';

import { SecuritySchema } from '../../data-source/Security.schema';
import { SchemaInputSchema } from '../json/schema-input';


export type { JsonSchemaInput, SchemaInput } from '../json/schema-input';

const ExternalOperationDefSchema = z.object({
  uri: z.string(),
  method: z.string().optional(),
});

const OperationDefSchema = z.union([
  z.literal(true),
  ExternalOperationDefSchema,
  z.object({
    schema: SchemaInputSchema.optional(),
    security: SecuritySchema.optional(),
  }),
]);

export type OperationDef = z.infer<typeof OperationDefSchema>;

export type PatchOperationDef = z.infer<typeof OperationDefSchema>;

export const CrudDefinitionSchema = z.object({
  findAll: OperationDefSchema.optional(),
  findOne: OperationDefSchema.optional(),
  create: OperationDefSchema.optional(),
  update: OperationDefSchema.optional(),
  patch: OperationDefSchema.optional(),
  delete: OperationDefSchema.optional(),
});

export type CrudDefinition = z.infer<typeof CrudDefinitionSchema>;

const DefinitionCallbackSchema = z.function({
  input: [],
  output: CrudDefinitionSchema,
});

export type DefinitionCallback = () => CrudDefinition;

export const DefinitionSchema = z.union([
  CrudDefinitionSchema,
  DefinitionCallbackSchema,
]);
