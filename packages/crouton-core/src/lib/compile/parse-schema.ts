import type { ZodObject, ZodRawShape, ZodType } from 'zod';

import {
  buildResourceJsonSchema,
  registerResourceExtensions,
} from '../resource';
import { type CompileResolvers, compileResource } from './compile-resource';
import type { EnumRegistry } from './enum-registry';
import {
  buildDefinitionPayload,
  buildResourceJsonPayload,
  buildViewsPayload,
} from './payload-builders';
import { type ResourceDefinitionResponse } from '../schema/response';

export type ParseSchemaView = 'schemas' | 'definition' | 'resource.json';

export interface ParseSchemaInput {
  /** Raw resource.json (validated internally) or an already-parsed ResourceJson. */
  json: unknown;
  /** Sibling schema.ts default export. Required for prisma resources; omit for kind:"custom". */
  schema?: ZodObject<ZodRawShape>;
  /** Accepted for API parity but ignored — no fs access in the pure path. */
  dirPath?: string;
  enums?: EnumRegistry;
  /** Filesystem resolvers for sibling-resource features; defaults to no-ops. */
  resolvers?: CompileResolvers;
}

export type ParseAppConfig = {
  baseUrl?: string;
  prefix?: string;
  extensions?: Record<string, ZodType>;
  schemaEnricher?: <T extends Record<string, unknown>>(
    schema: T,
  ) => Record<string, unknown>;
};

/**
 * Compile a single resource to its schema payload without booting a Nest module.
 * Returns `undefined` for `view: 'schemas'` when the resource declares no views.
 */
export const parseSchema = (
  input: ParseSchemaInput | unknown,
  appConfig: ParseAppConfig,
  view: ParseSchemaView = 'schemas',
): ResourceDefinitionResponse | undefined => {
  if (appConfig.extensions) registerResourceExtensions(appConfig.extensions);
  const normalized: ParseSchemaInput =
    input !== null && typeof input === 'object' && 'json' in (input as object)
      ? (input as ParseSchemaInput)
      : { json: input };

  const parseResult = buildResourceJsonSchema().safeParse(normalized.json);
  if (!parseResult.success) {
    throw new Error(`Resource cannot be parsed: ${parseResult.error.message}`);
  }

  const resource = compileResource(parseResult.data, normalized.schema, {
    baseUrl: appConfig.baseUrl,
    enums: normalized.enums ?? {},
    resolvers: normalized.resolvers,
  });

  let payload: Record<string, unknown> | undefined;

  if (view === 'schemas') {
    payload = buildViewsPayload(resource, appConfig.baseUrl);
  } else if (view === 'definition') {
    payload = buildDefinitionPayload(resource);
  } else {
    payload = buildResourceJsonPayload(resource, appConfig.baseUrl);
  }

  if (payload && appConfig.schemaEnricher) {
    payload = { ...payload, ...appConfig.schemaEnricher(payload) };
  }

  return payload as unknown as ResourceDefinitionResponse;
};
