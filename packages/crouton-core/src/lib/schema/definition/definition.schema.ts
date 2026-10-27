import { z } from 'zod';

import { SchemaInputSchema } from '../../compile/schema-input';
import { SecuritySchema } from '../../data-source/Security.schema';

export type { JsonSchemaInput, SchemaInput } from '../../compile/schema-input';

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
