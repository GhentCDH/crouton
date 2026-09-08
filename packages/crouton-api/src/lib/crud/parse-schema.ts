import type { ZodObject, ZodRawShape } from 'zod';

import { buildResourceJsonSchema, registerResourceExtensions } from '@ghentcdh/crouton-core';

import type { ResourceRowAction, ResourceTableAction } from './action';
import { fromJson } from './adapter';
import type { CroutonAppConfig } from './app-config';
import type { EnumRegistry } from './enum-registry';
import type { ResourceHooks } from './hooks';
import {
  buildDefinitionPayload,
  buildResourceJsonPayload,
  buildViewsPayload,
} from './operations/payload-builders';

export type ParseSchemaView = 'schemas' | 'definition' | 'resource.json';

export interface ParseSchemaInput {
  /** Raw resource.json (validated internally) or an already-parsed ResourceJson. */
  json: unknown;
  /** Sibling schema.ts default export. Required for prisma resources; omit for kind:"custom". */
  schema?: ZodObject<ZodRawShape>;
  /** Enables sibling-resource features (extend columns, resource-ref options, sub-resources). */
  dirPath?: string;
  enums?: EnumRegistry;
  hooks?: ResourceHooks;
  actions?: ResourceRowAction[];
  tableActions?: ResourceTableAction[];
}

export type ParseAppConfig = Pick<
  CroutonAppConfig,
  'baseUrl' | 'prefix' | 'extensions' | 'schemaEnricher'
>;

/**
 * Compile a single resource to its schema payload without booting a Nest module.
 *
 * `prefix` is accepted for API parity with `forResourceDir` but ignored here —
 * only `baseUrl` affects URIs in the payload.
 *
 * Returns `undefined` for `view: 'schemas'` when the resource declares no views.
 *
 * Without `dirPath`, features that read sibling files are skipped: extend columns,
 * resource-ref column options, and sub-resource views.
 */
export const parseSchema = (
  input: ParseSchemaInput | unknown,
  appConfig: ParseAppConfig,
  view: ParseSchemaView = 'schemas',
): Record<string, unknown> | undefined => {
  if (appConfig.extensions) registerResourceExtensions(appConfig.extensions);

  const normalized: ParseSchemaInput =
    input !== null &&
    typeof input === 'object' &&
    'json' in (input as object)
      ? (input as ParseSchemaInput)
      : { json: input };

  const parseResult = buildResourceJsonSchema().safeParse(normalized.json);
  if (!parseResult.success) {
    throw new Error(
      `Resource cannot be parsed: ${parseResult.error.message}`,
    );
  }

  const resource = fromJson(
    parseResult.data,
    normalized.schema,
    normalized.hooks,
    normalized.dirPath,
    appConfig.baseUrl,
    normalized.actions,
    normalized.tableActions,
    normalized.enums ?? {},
    undefined,
  );

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

  return payload;
};
