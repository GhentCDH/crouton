import type { resolveDefinition, ResourceConfig, schemaFor } from '../crud.config';

export type OperationContext = {
  /** The dynamically-built controller class. */
  cls: any;
  config: ResourceConfig;
  definition: ReturnType<typeof resolveDefinition>;
  listSchema: ReturnType<typeof schemaFor>;
  oneSchema: ReturnType<typeof schemaFor>;
  createSchema: ReturnType<typeof schemaFor>;
  updateSchema: ReturnType<typeof schemaFor>;
  upsertSchema: ReturnType<typeof schemaFor>;
  /** `{ name: 'id', type: 'string' | 'number' }` for Swagger @ApiParam. */
  idParamMeta: { name: string; type: string };
  /** Returns the correct Body() decorator: with ZodValidationPipe for Zod schemas, plain Body() otherwise. */
  bodyDecorator: (schema?: ReturnType<typeof schemaFor>) => ParameterDecorator;
  baseUrl?: string;
};
