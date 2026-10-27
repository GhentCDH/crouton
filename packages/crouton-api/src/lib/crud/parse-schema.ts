import {
  type ParseSchemaInput as CoreParseSchemaInput,
  type ParseSchemaView,
  type ResourceDefinitionResponse,
  ResourceDefinitionResponseZ,
  buildResourceJsonSchema,
  parseSchema as coreParseSchema,
  registerResourceExtensions,
} from '@ghentcdh/crouton-core';

import type { ResourceRowAction, ResourceTableAction } from './action';
import { buildResolvers } from './adapter/resolver-builder';
import type { CroutonAppConfig } from './app-config';
import type { ResourceHooks } from './hooks';

export type { ParseSchemaView };

export interface ParseSchemaInput extends CoreParseSchemaInput {
  /** Enables sibling-resource features (extend columns, resource-ref options, sub-resources). */
  dirPath?: string;
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

  const { dirPath, enums = {} } = normalized;

  const payload = coreParseSchema(
    {
      ...normalized,
      resolvers: buildResolvers(
        parseResult.data.kind === 'custom',
        dirPath,
        appConfig.baseUrl,
        enums,
      ),
    },
    appConfig,
    view,
  ) as Record<string, unknown> | undefined;

  if (!payload) return undefined;

  if (view === 'schemas') {
    const formDef = ResourceDefinitionResponseZ.parse(payload);
    if (appConfig.schemaEnricher) {
      return {
        ...formDef,
        ...appConfig.schemaEnricher(formDef),
      } as ResourceDefinitionResponse;
    }
    return formDef;
  }

  if (appConfig.schemaEnricher) {
    return {
      ...payload,
      ...appConfig.schemaEnricher(payload),
    } as ResourceDefinitionResponse;
  }

  return payload as unknown as ResourceDefinitionResponse;
};
