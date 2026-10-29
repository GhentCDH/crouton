import type { CompileResolvers, EnumRegistry, JsonColumn  } from '@ghentcdh/crouton-core';
import { resolveLayoutVisibility } from '@ghentcdh/crouton-core';

import { enrichResourceRefColumns } from './column-enrichment';
import { expandExtendColumns } from './column-transforms';
import { resolveChildResource } from './resource-resolver';
import { buildSubResources } from './sub-resource.builder';

/** Build CompileResolvers from api-specific dirPath/baseUrl/enums. */
export const buildResolvers = (
  isCustom: boolean,
  dirPath: string | undefined,
  baseUrl: string | undefined,
  enums: EnumRegistry,
): CompileResolvers => ({
  expandColumns: (cols) => expandExtendColumns(cols, dirPath),
  enrichResourceRefs: (cols) => enrichResourceRefColumns(cols, dirPath, baseUrl) ?? cols,
  buildSubResources: (cols, ctx) =>
    isCustom ? [] : buildSubResources(cols, ctx.route, ctx.model, dirPath, enums, baseUrl),
  resolveLookupDisplayKeys: (cols) => resolveLookupDisplayKeys(cols, dirPath),
});

const resolveLookupDisplayKeys = (
  columns: JsonColumn[],
  dirPath: string | undefined,
): Record<string, string> => {
  const result: Record<string, string> = {};
  if (!dirPath) return result;
  for (const col of columns) {
    if (!col.showInLookup || col.fieldInput?.relationType !== 'manyToOne') continue;
    if (!col.fieldInput?.resource) continue;
    const child = resolveChildResource(col.fieldInput.resource, dirPath);
    const childColumns = child ? expandExtendColumns(child.json.columns ?? [], dirPath) : undefined;
    const tableIds = resolveLayoutVisibility(
      child?.json.layout,
      childColumns ?? [],
    ).table;
    const displayCol = childColumns?.find(
      (c) => !c.idField && tableIds?.has(c.id),
    );
    if (displayCol) result[col.id] = `${col.id.replace(/Id$/, '')}.${displayCol.id}`;
  }
  return result;
};
