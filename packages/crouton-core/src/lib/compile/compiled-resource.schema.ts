import { z } from 'zod';

import {  ResourceJsonShape, JsonColumnBaseSchema , JsonIncludeEntrySchema  } from '../resource';
import { ViewConfigSchema } from '../view';
import { CompiledSubResourceConfigSchema } from './compiled-sub-resource.schema';
import { ValueLabelColumnSchema } from './value-label-column';
import { DefinitionSchema } from '../schema/definition/definition.schema';
import { LookupSchema } from '../schema/definition/lookup.schema';

export const CompiledResourceSchema = ResourceJsonShape.extend({
  // Override: ResourceJsonShape.columns is the map (input) form; after compile, columns is always an array.
  columns: z.array(JsonColumnBaseSchema).optional(),
  route: z.string(),
  valueLabelColumns: z.array(ValueLabelColumnSchema).default([]),
  subResources: z.lazy(() => z.array(CompiledSubResourceConfigSchema)).default([]),
  search: z.array(z.string()).optional(),
  lookup: LookupSchema.optional(),
  views: z.record(z.string(), ViewConfigSchema),
  definition: DefinitionSchema,
  idField: z.string(),
  modalSize: z.enum(['xs', 'sm', 'lg', 'xl']).optional(),
  /** Eager-loaded relations for findAll (list) queries. From operations.findAll.include. */
  include: z.array(JsonIncludeEntrySchema).optional(),
  /** Eager-loaded relations for findOne (detail) queries. From operations.findOne.include. */
  findOneInclude: z.array(JsonIncludeEntrySchema).optional(),
  /** Prisma model name (flattened from source.model). */
  model: z.string().optional(),
  /** Database table name override (flattened from source.dbTable). */
  table: z.string().optional(),
  /** Datasource name (flattened from source.datasource). */
  database: z.string().optional(),
  /** Primary key type (flattened from source.idType). */
  idType: z.enum(['string', 'number']).optional(),
});

export type CompiledResource = z.infer<typeof CompiledResourceSchema>;
