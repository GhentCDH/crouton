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
export * from './introspect';
export * from './classify';
export * from './diff';
export * from './resolve';
export * from './serialize';
export * from './apply';
export * from './commit';
export * from './config';
export * from './scaffold';
export * from './datasource-scaffold';
export * from './custom-resource-scaffold';
export * from './project';
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
