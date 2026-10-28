import type { ZodObject, ZodRawShape } from 'zod';

import { compileResource } from '@ghentcdh/crouton-core';
import type { EnumRegistry, ResourceJson,
  ResourceRowAction,
  ResourceTableAction  } from '@ghentcdh/crouton-core';


import type { CustomRepository } from '../custom-repository';
import type { ResourceHooks } from '../hooks';
import { buildResolvers } from './resolver-builder';
import { type Resource } from '../resource/ResourceConfig.schema';

export const fromJson = (
  json: ResourceJson,
  schema: ZodObject<ZodRawShape> | undefined,
  hooks: ResourceHooks | undefined,
  /** Absolute path to the resource directory (needed to resolve sibling resources). */
  dirPath?: string,
  /** Base URL for generating full URIs in column options (e.g. `http://localhost:3000`). */
  baseUrl?: string,
  /** Resolved action procedures loaded from the `actions/` directory. */
  actions?: ResourceRowAction[],
  /** Resolved table-level action procedures loaded from the `actions/` directory. */
  tableActions?: ResourceTableAction[],
  /** Project enum registry — injected into columns that reference an enum by name. */
  enums: EnumRegistry = {},
  /** Data access for a `kind: "custom"` resource, loaded from `repository.ts`. */
  repository?: CustomRepository,
): Resource => {
  const compiled = compileResource(json, schema, {
    baseUrl,
    enums,
    resolvers: buildResolvers(json.kind === 'custom', dirPath, baseUrl, enums),
  });

  return {
    ...compiled,
    ...(hooks && { hooks }),
    ...(repository && { repository }),
    ...(actions?.length && { actions }),
    ...(tableActions?.length && { tableActions }),
  } as Resource;
};
