import { z } from 'zod';

import {   ResourceJsonShape } from '../resource';
import {
  IdTypeSchema,
  ModalSizeSchema,
  OptionalIncludeListSchema,
  OptionalValueLabelColumnsSchema,
  OptionalViewsSchema,
} from './compiled-shared.schema';
import { CompiledSubResourceConfigSchema } from './compiled-sub-resource.schema';
import { JsonColumnBaseSchema } from '../resource/Column';
import { DefinitionSchema } from '../schema/definition/definition.schema';
import { LookupSchema } from '../schema/definition/lookup.schema';

export const CompiledResourceSchema = ResourceJsonShape.omit({
  // Input-only: the compiled resource carries the resolved `definition`, not
  // the raw operation toggles.
  operations: true,
  // Input-only: only `openapi.tag` is read, and it is flattened onto `tag`.
  openapi: true,
  // Input-only: the loader reads it before compiling and skips the resource.
  draft: true,
  // Input-only: editor autocomplete pointer, ignored at runtime.
  $schema: true,
  // Input-only: the compiled resource carries the flattened fields below.
  source: true,
  // Legacy root aliases: the compiler normalizes them (with `source`) into the
  // flattened fields below and never copies the raw keys.
  model: true,
  table: true,
  database: true,
  idType: true,
  // Input-only: the compiler derives `findAllInclude`/`findOneInclude` from the
  // operation include config; the raw legacy key is not copied.
  include: true,
}).extend({
  // Override: ResourceJsonShape.columns is the map (input) form; after compile, columns is always an array.
  columns: z.array(JsonColumnBaseSchema).optional(),
  route: z.string(),
  /** Omitted when no column needs a value→label envelope. */
  valueLabelColumns: OptionalValueLabelColumnsSchema,
  // The compiler always emits this; `z.lazy` was only needed for a cycle the
  // sub-resource schema does not introduce.
  subResources: z.array(CompiledSubResourceConfigSchema),
  search: z.array(z.string()).optional(),
  lookup: LookupSchema.optional(),
  /** Omitted when the resource has no layout-derived views. */
  views: OptionalViewsSchema,
  definition: DefinitionSchema,
  idField: z.string(),
  modalSize: ModalSizeSchema.optional(),
  /** Eager-loaded relations for findAll (list) queries. From operations.findAll.include. */
  findAllInclude: OptionalIncludeListSchema,
  /** Eager-loaded relations for findOne (detail) queries. From operations.findOne.include. */
  findOneInclude: OptionalIncludeListSchema,
  /** Prisma model name (flattened from source.model). */
  model: z.string().optional(),
  /** Database table name override (flattened from source.dbTable). */
  table: z.string().optional(),
  /** Datasource name (flattened from source.datasource). */
  database: z.string().optional(),
  /** Primary key type (flattened from source.idType). Defaults to "string". */
  idType: IdTypeSchema.default('string'),
});

export type CompiledResource = z.infer<typeof CompiledResourceSchema>;
