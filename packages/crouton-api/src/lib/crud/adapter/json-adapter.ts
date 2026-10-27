import type { ZodObject, ZodRawShape } from 'zod';

import type { JsonColumn, ResourceJson } from '@ghentcdh/crouton-core';
import { compileResource } from '@ghentcdh/crouton-core';

import type { ResourceRowAction, ResourceTableAction } from '../action';
import type { CustomRepository } from '../custom-repository';
import type { EnumRegistry } from '../enum-registry';
import type { ResourceHooks } from '../hooks';
import { enrichResourceRefColumns } from './column-enrichment';
import { expandExtendColumns } from './column-transforms';
import { resolveChildResource } from './resource-resolver';
import { buildSubResources } from './sub-resource.builder';
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
    resolvers: {
      expandColumns: (cols) => expandExtendColumns(cols, dirPath),
      enrichResourceRefs: (cols) =>
        enrichResourceRefColumns(cols, dirPath, baseUrl) ?? cols,
      buildSubResources: (cols, ctx) =>
        json.kind === 'custom'
          ? []
          : buildSubResources(
              cols,
              ctx.route,
              ctx.model,
              dirPath,
              enums,
              baseUrl,
            ),
      resolveLookupDisplayKeys: (cols) =>
        resolveLookupDisplayKeys(cols, dirPath),
    },
  });

  return {
    ...compiled,
    ...(hooks && { hooks }),
    ...(repository && { repository }),
    ...(actions?.length && { actions }),
    ...(tableActions?.length && { tableActions }),
  } as unknown as Resource;
};

const resolveLookupDisplayKeys = (
  columns: JsonColumn[],
  dirPath: string | undefined,
): Record<string, string> => {
  const result: Record<string, string> = {};
  if (!dirPath) return result;
  for (const col of columns) {
    if (!col.showInLookup || col.fieldInput?.relationType !== 'manyToOne')
      continue;
    if (!col.fieldInput?.resource) continue;
    const child = resolveChildResource(col.fieldInput.resource, dirPath);
    const childColumns = child
      ? expandExtendColumns(child.json.columns ?? [], dirPath)
      : undefined;
    const displayCol = childColumns?.find(
      (c) => !c.idField && !c.hiddenInTable,
    );
    if (displayCol)
      result[col.id] = `${col.id.replace(/Id$/, '')}.${displayCol.id}`;
  }
  return result;
};
