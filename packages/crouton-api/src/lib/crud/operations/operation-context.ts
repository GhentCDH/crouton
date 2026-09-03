import type { SecurityConfig } from '@ghentcdh/crouton-core';

import type { CrudOperation, resolveDefinition, schemaFor } from '../crud.config';
import { type Resource } from '../resource/ResourceConfig.schema';
import type { SubResourceConfig } from '../resource/SubResource.schema';
import type { ZodValidationPipeOptions } from '../zod-validation.pipe';

export type OperationContext = {
  /** The dynamically-built controller class. */
  cls: any;
  config: Resource;
  definition: ReturnType<typeof resolveDefinition>;
  listSchema: ReturnType<typeof schemaFor>;
  oneSchema: ReturnType<typeof schemaFor>;
  createSchema: ReturnType<typeof schemaFor>;
  updateSchema: ReturnType<typeof schemaFor>;
  patchSchema: ReturnType<typeof schemaFor>;
  upsertSchema: ReturnType<typeof schemaFor>;
  /** `{ name: 'id', type: 'string' | 'number' }` for Swagger @ApiParam. */
  idParamMeta: { name: string; type: string };
  /** Returns the correct Body() decorator: with ZodValidationPipe for Zod schemas, plain Body() otherwise. */
  bodyDecorator: (
    schema?: ReturnType<typeof schemaFor>,
    options?: ZodValidationPipeOptions,
  ) => ParameterDecorator;
  baseUrl?: string;
  /** Module-level default security (fallback when neither op nor resource declares security). */
  moduleDefaultSecurity?: SecurityConfig;
  /** Tag a just-defined handler with its effective security metadata. */
  secure: (methodName: string, op: CrudOperation, sub?: SubResourceConfig) => void;
  /**
   * Called on every schema-serving request; its return value is spread into
   * the payload. Use for dynamic fields like `generatedTimestamp` or `author`.
   */
  schemaEnricher?: () => Record<string, unknown>;
};
