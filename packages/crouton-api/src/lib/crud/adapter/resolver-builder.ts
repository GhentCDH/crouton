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
    // Resolve display keys for all manyToOne relation columns so both
    // lookup.labels (new) and showInLookup (legacy) paths can use them.
    const relationType = col.relation?.type ?? col.fieldInput?.relationType;
    const resourcePath = col.relation?.resource ?? col.fieldInput?.resource;
    if (relationType !== 'manyToOne' || !resourcePath) continue;
    const child = resolveChildResource(resourcePath, dirPath);
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
