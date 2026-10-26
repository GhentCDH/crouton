import { z } from 'zod';

import { SecuritySchema } from '../../data-source/Security.schema';
import { LookupSchema } from '../lookup.schema';
import { ValueLabelColumnSchema } from '../value-label-column';
import { ModelSchema } from './model.schema';

// ---------------------------------------------------------------------------
// Primitives shared across sub-schemas
// ---------------------------------------------------------------------------

const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

/** Opaque JSON Schema blob — validated structurally by @jsonforms/core at use sites. */
const JsonSchemaSchema = z.record(z.string(), z.unknown());

/** Opaque UI Schema blob (JSON Forms). */
const UiSchemaSchema = z.record(z.string(), z.unknown());

const RelationKindSchema = z.enum(['oneToMany', 'manyToOne', 'manyToMany']);

// ---------------------------------------------------------------------------
// DataField — per-field data facts (no presentation)
// ---------------------------------------------------------------------------

export const DataFieldSchema = z.object({
  id: z.string(),
  dbName: z.string(),
  type: z.string(),
  required: z.boolean(),
  unique: z.boolean().optional(),
  relation: z
    .object({
      kind: RelationKindSchema,
      target: z.string(),
      displayKey: z.string().optional(),
      valueKey: z.string().optional(),
    })
    .optional(),
  computed: z.object({ sql: z.string() }).optional(),
});

export type DataField = z.infer<typeof DataFieldSchema>;

// ---------------------------------------------------------------------------
// NormalizedData — backend-only data facts (never sent over HTTP)
// ---------------------------------------------------------------------------

const IncludeSpecSchema = z.string();

const SubResourceDescSchema = z.object({
  childRoute: z.string(),
  target: z.string(),
  relationType: RelationKindSchema,
  column: z.string(),
  displayKey: z.string().optional(),
});

const ActionDescSchema = z.object({
  id: z.string(),
  scope: z.enum(['row', 'table']),
  uri: z.string(),
  method: HttpMethodSchema,
});

export const NormalizedDataSchema = z.object({
  model: ModelSchema.optional(),
  datasource: z.string().optional(),
  dbTable: z.string().optional(),
  prismaModel: z.string().optional(),
  idField: z.string(),
  idType: z.enum(['string', 'number']).default('string'),
  fields: z.record(z.string(), DataFieldSchema),
  search: z.array(z.string()).default([]),
  lookup: LookupSchema.optional(),
  include: z.object({
    findAll: z.array(IncludeSpecSchema).default([]),
    findOne: z.array(IncludeSpecSchema).default([]),
  }),
  allowedIncludes: z.array(z.string()).default([]),
  valueLabels: z.array(ValueLabelColumnSchema).default([]),
  computed: z
    .array(z.object({ id: z.string(), sql: z.string(), type: z.string() }))
    .default([]),
  subResources: z.array(SubResourceDescSchema).default([]),
  actions: z.array(ActionDescSchema).default([]),
});

export type NormalizedData = z.infer<typeof NormalizedDataSchema>;

// ---------------------------------------------------------------------------
// NormalizedResource — full normalized output
// ---------------------------------------------------------------------------

const OperationRecordSchema = z.record(
  z.string(),
  z.object({
    enabled: z.boolean(),
    uri: z.string(),
    method: HttpMethodSchema,
    external: z.boolean().optional(),
    security: SecuritySchema.optional(),
  }),
);

const SchemaViewSchema = z.object({
  data: JsonSchemaSchema,
  ui: UiSchemaSchema,
});

export const NormalizedResourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  route: z.string(),
  uri: z.string(),
  title: z.string(),
  kind: z.enum(['prisma', 'custom']),
  parent: z
    .object({ route: z.string(), param: z.string() })
    .optional(),
  display: z.object({
    mode: z.enum(['modal', 'page']),
    customComponent: z.string().nullable(),
  }),
  modalSize: z.enum(['xs', 'sm', 'lg', 'xl']).default('lg'),
  security: SecuritySchema.optional(),
  operations: OperationRecordSchema,
  /** Keyed by layout name ('form', 'view', 'table', custom). */
  schemas: z.record(z.string(), SchemaViewSchema),
  data: NormalizedDataSchema,
  extensions: z.record(z.string(), z.unknown()).default({}),
  /** Maps JSON-pointer-into-schemas to i18n key. Populated by stage 2.5, consumed by localizeSchemas. */
  i18n: z.object({ keys: z.record(z.string(), z.string()) }).default({ keys: {} }),
});

export type NormalizedResource = z.infer<typeof NormalizedResourceSchema>;

/**
 * Result returned by normalizeResource().
 *
 * Phase 0 decision (§8): operation-level JSON Schemas stay in bind, built from
 * Zod validators. NormalizedResource carries only the layout schemas
 * (form/view/table). The /definition endpoint reconstructs per-op JSON Schemas
 * from the same Zod validators as today.
 */
export const NormalizeResultSchema = z.object({
  resource: NormalizedResourceSchema,
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

export type NormalizeResult = z.infer<typeof NormalizeResultSchema>;
