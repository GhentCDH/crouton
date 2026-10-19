import { z } from 'zod';

import { JsonDisplaySchema, ResourceJsonShape } from '../resource';
import { JsonIncludeEntrySchema } from '../resource/include.schema';
import { ViewConfigSchema } from '../view';
import { CompiledSubResourceConfigSchema } from './compiled-sub-resource.schema';
import { DefinitionSchema } from './definition.schema';
import { LookupSchema } from './lookup.schema';
import { ValueLabelColumnSchema } from './value-label-column';

export const CompiledResourceSchema = ResourceJsonShape.extend({
  route: z.string(),
  valueLabelColumns: z.array(ValueLabelColumnSchema).default([]),
  subResources: z.lazy(() => z.array(CompiledSubResourceConfigSchema)).default([]),
  search: z.array(z.string()).optional(),
  lookup: LookupSchema.optional(),
  views: z.record(z.string(), ViewConfigSchema),
  definition: DefinitionSchema,
  idField: z.string(),
  // Derived from layout.form.container / layout.view.container at compile time (Block 2)
  display: JsonDisplaySchema.optional(),
  modalSize: z.enum(['xs', 'sm', 'lg', 'xl']).optional(),
  /** Eager-loaded relations for findAll (list) queries. From operations.findAll.include. */
  include: z.array(JsonIncludeEntrySchema).optional(),
  /** Eager-loaded relations for findOne (detail) queries. From operations.findOne.include. */
  findOneInclude: z.array(JsonIncludeEntrySchema).optional(),
  /** Prisma model name (flattened from source.model). */
  model: z.string().optional(),
  /** Database table name override (flattened from source.table). */
  table: z.string().optional(),
  /** Datasource name (flattened from source.database). */
  database: z.string().optional(),
  /** Primary key type (flattened from source.idType). */
  idType: z.enum(['string', 'number']).optional(),
});

export type CompiledResource = z.infer<typeof CompiledResourceSchema>;
