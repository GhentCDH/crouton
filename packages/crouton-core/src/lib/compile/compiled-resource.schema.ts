import { z } from 'zod';

import {   ResourceJsonShape } from '../resource';
import { JsonColumnBaseSchema } from '../resource';
import { CompiledSubResourceConfigSchema } from './compiled-sub-resource.schema';
import {
  IdTypeSchema,
  ModalSizeSchema,
  OptionalIncludeListSchema,
  ValueLabelColumnsSchema,
  ViewsSchema,
} from './compiled-shared.schema';
import { DefinitionSchema } from './definition.schema';
import { LookupSchema } from './lookup.schema';

export const CompiledResourceSchema = ResourceJsonShape.extend({
  // Override: ResourceJsonShape.columns is the map (input) form; after compile, columns is always an array.
  columns: z.array(JsonColumnBaseSchema).optional(),
  route: z.string(),
  valueLabelColumns: ValueLabelColumnsSchema.default([]),
  subResources: z.lazy(() => z.array(CompiledSubResourceConfigSchema)).default([]),
  search: z.array(z.string()).optional(),
  lookup: LookupSchema.optional(),
  views: ViewsSchema,
  definition: DefinitionSchema,
  idField: z.string(),
  modalSize: ModalSizeSchema.optional(),
  /** Eager-loaded relations for findAll (list) queries. From operations.findAll.include. */
  include: OptionalIncludeListSchema,
  /** Eager-loaded relations for findOne (detail) queries. From operations.findOne.include. */
  findOneInclude: OptionalIncludeListSchema,
  /** Prisma model name (flattened from source.model). */
  model: z.string().optional(),
  /** Database table name override (flattened from source.dbTable). */
  table: z.string().optional(),
  /** Datasource name (flattened from source.datasource). */
  database: z.string().optional(),
  /** Primary key type (flattened from source.idType). */
  idType: IdTypeSchema.optional(),
});

export type CompiledResource = z.infer<typeof CompiledResourceSchema>;
