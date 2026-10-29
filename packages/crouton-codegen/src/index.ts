/**
 * `@ghentcdh/crouton-codegen` — UI-agnostic engine that generates / updates
 * crouton `resource.json` (+ `schema.ts`) files from a Prisma schema.
 *
 * Pipeline: introspect → classify → diff → resolve → apply → commit.
 * Every stage is pure except `commit`; `resolve` delegates decisions to a
 * pluggable `DecisionResolver`, so the same engine drives the interactive CLI
 * and a backend dev-mode endpoint.
 */

export * from './db-model';
export * from './draft';
export * from './decision';
export * from './write-plan';
export * from './naming';
export type {
  Dmmf,
  DmmfDatamodel,
  DmmfEnum,
  DmmfField,
  DmmfLoader,
  DmmfModel,
  IntrospectOptions,
} from './introspect';
export { introspect, loadDmmf } from './introspect';
export type { ClassifyContext } from './classify';
export { classify } from './classify';
export * from './diff';
export * from './resolve';
export * from './serialize';
export * from './apply';
export * from './commit';
export type { LoadedConfig } from './config';
export {
  defaultPrismaConfig,
  findConfigPath,
  loadConfig,
  loadDatasources,
  makeSchemaExportName,
  resolveDatasource,
  resolveFromRoot,
  validateDatasources,
} from './config';
export * from './scaffold';
export * from './datasource-scaffold';
export * from './custom-resource-scaffold';
export type { ExistingResource } from './project';
export {
  listAllResourceNames,
  listResourceNames,
  makeRelationResolver,
  readAllResourceJsons,
  readExistingResource,
} from './project';
export * from './plan';
export * from './enum-registry';
export * from './translations';
export { clone, columnEntries, columnsMapFromEntries, deepEqual } from './util';
export * from './prisma-shell';
export * from './validate';
export * from './agent-block/upsert-agent-block';
export * from './agent-files/render';
export * from './agent-files/manifest';
export * from './agent-files/sync';
export * from './migrate/layout-precedence';
export * from './migrate/relation-keys';
export * from './migrate/search-fields';
export * from './migrate/display-to-container';
export * from './migrate/lookup-labels';
export * from './migrate/root-include';
export * from './migrate/source';
export * from './migrate/calculated-columns';
export * from './migrate/openapi-tag';
export * from './migrate/root-id';
