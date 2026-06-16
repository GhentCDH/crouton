/**
 * `@ghentcdh/crouton-codegen` — UI-agnostic engine that generates / updates
 * crouton `resource.json` (+ `schema.ts`) files from a Prisma schema.
 *
 * Pipeline: introspect → classify → diff → resolve → apply → commit.
 * Every stage is pure except `commit`; `resolve` delegates decisions to a
 * pluggable `DecisionResolver`, so the same engine drives the interactive CLI
 * and a backend dev-mode endpoint.
 */

export * from './types';
export * from './naming';
export * from './introspect';
export * from './classify';
export * from './diff';
export * from './resolve';
export * from './serialize';
export * from './apply';
export * from './commit';
export * from './config';
export * from './project';
export * from './plan';
export * from './enum-registry';
export { clone, columnEntries, columnsMapFromEntries, deepEqual } from './util';
