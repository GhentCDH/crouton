import { z } from 'zod';

import {   ResourceJsonShape } from '../resource';
import {
  IdTypeSchema,
  ModalSizeSchema,
  OptionalIncludeListSchema,
  ValueLabelColumnsSchema,
  ViewsSchema,
} from './compiled-shared.schema';
import { CompiledSubResourceConfigSchema } from './compiled-sub-resource.schema';
import { JsonColumnBaseSchema } from '../resource/Column';
import { DefinitionSchema } from '../schema/definition/definition.schema';
import { LookupSchema } from '../schema/definition/lookup.schema';

export const CompiledResourceSchema = ResourceJsonShape.omit({
  // Input-only: the compiled resource carries the resolved `definition`, not
  // the raw operation toggles.
  operations: true,
}).extend({
  // Override: ResourceJsonShape.columns is the map (input) form; after compile, columns is always an array.
  columns: z.array(JsonColumnBaseSchema).optional(),
  route: z.string(),
  valueLabelColumns: ValueLabelColumnsSchema.default([]),
  // The compiler always emits this; `z.lazy` was only needed for a cycle the
  // sub-resource schema does not introduce.
  subResources: z.array(CompiledSubResourceConfigSchema),
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
