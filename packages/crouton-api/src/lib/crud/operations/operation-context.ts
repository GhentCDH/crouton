import type { resolveDefinition, schemaFor } from '../crud.config';
import type { ZodValidationPipeOptions } from '../zod-validation.pipe';
import { Resource } from '../resource/ResourceConfig.schema';

export type OperationContext = {
  /** The dynamically-built controller class. */
  cls: any;
  config: Resource;
  definition: ReturnType<typeof resolveDefinition>;
  listSchema: ReturnType<typeof schemaFor>;
  oneSchema: ReturnType<typeof schemaFor>;
  createSchema: ReturnType<typeof schemaFor>;
  updateSchema: ReturnType<typeof schemaFor>;
  upsertSchema: ReturnType<typeof schemaFor>;
  /** `{ name: 'id', type: 'string' | 'number' }` for Swagger @ApiParam. */
  idParamMeta: { name: string; type: string };
  /** Returns the correct Body() decorator: with ZodValidationPipe for Zod schemas, plain Body() otherwise. */
  bodyDecorator: (
    schema?: ReturnType<typeof schemaFor>,
    options?: ZodValidationPipeOptions,
  ) => ParameterDecorator;
  baseUrl?: string;
};
