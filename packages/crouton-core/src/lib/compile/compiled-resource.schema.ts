import { z } from 'zod';

import { ResourceJsonShape } from '../resource';
import { JsonColumnSchema } from '../resource/Column';
import { DefinitionSchema } from '../schema/definition/definition.schema';
import { LookupSchema } from '../schema/definition/lookup.schema';
import {
  IdTypeSchema,
  OptionalCalculatedColumnsSchema,
  OptionalIncludeListSchema,
  OptionalViewsSchema,
} from './compiled-shared.schema';
import { CompiledSubResourceConfigSchema } from './compiled-sub-resource.schema';

export const CompiledResourceSchema = ResourceJsonShape.omit({
  // Input-only: the compiled resource carries the resolved `definition`, not
  // the raw operation toggles.
  operations: true,
  // Input-only: flattened onto `tag` / `tagDescription`.
  openapi: true,
  // Input-only: the loader reads it before compiling and skips the resource.
  draft: true,
  // Input-only: editor autocomplete pointer, ignored at runtime.
  $schema: true,
  // Input-only: the compiled resource carries the flattened fields below.
  source: true,
}).extend({
  // Override: ResourceJsonShape.columns is the map (input) form; after compile, columns is always an array.
  columns: z.array(JsonColumnSchema).optional(),
  route: z.string(),
  /** Omitted when the resource has no SQL-computed columns. */
  calculatedColumns: OptionalCalculatedColumnsSchema,
  // The compiler always emits this; `z.lazy` was only needed for a cycle the
  // sub-resource schema does not introduce.
  subResources: z.array(CompiledSubResourceConfigSchema),
  search: z.array(z.string()).optional(),
  /** Column ids the server accepts in the ?filter= query param. Absent = all columns allowed. */
  filterAllowlist: z.array(z.string()).optional(),
  lookup: LookupSchema.optional(),
  /** Omitted when the resource has no layout-derived views. */
  views: OptionalViewsSchema,
  definition: DefinitionSchema,
  idField: z.string(),
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
  /** OpenAPI tag description (flattened from openapi.description). */
  tagDescription: z.string().optional(),
});

export type CompiledResource = z.infer<typeof CompiledResourceSchema>;
