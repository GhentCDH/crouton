/**
 * Resource-config (`resource.json`) types.
 *
 * These types now live in `@ghentcdh/crouton-core` so they can be shared with
 * tooling (e.g. `@ghentcdh/crouton-codegen`) without pulling in NestJS. This
 * module re-exports them to preserve the existing `./json-config.types` import
 * paths used throughout crouton-api.
 */

export type {
  CalculatedColumn,
  DetailConfig,
  DetailControl,
  FieldInput,
  JsonAction,
  JsonActionCondition,
  JsonColumn,
  JsonColumnsMap,
  JsonIncludeEntry,
  JsonLinkAction,
  JsonOperations,
  JsonProcedureAction,
  JsonResourceConfig,
  JsonTableAction,
  JsonTableLinkAction,
  JsonTableProcedureAction,
  RelationType,
} from '@ghentcdh/crouton-core';

export { labelFromId, normalizeColumns } from '@ghentcdh/crouton-core';
