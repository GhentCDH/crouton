import type { ZodObject, ZodRawShape } from 'zod';

import type {
  CalculatedColumn,
  JsonColumn,
  ResourceJson,
} from '@ghentcdh/crouton-core';

import type { ResourceRowAction, ResourceTableAction } from '../action';
import {
  buildViews,
  injectCalculatedColumns,
  injectCalculatedColumnsToView
} from '../builder';
import { opWithSchema, pickByColumns, upsertOp } from '../builder/schema.helpers';
import { type EnumRegistry, injectEnumValues } from '../enum-registry';
import type { ResourceHooks } from '../hooks';
import type { ResourceDefinition } from '../resource/defintion.schema';
import type { LookupConfig } from '../resource/lookup.schema';
import { type Resource } from '../resource/ResourceConfig.schema';
import { enrichActionColumns, enrichIncludeWithSort, enrichResourceRefColumns } from './column-enrichment';
import { applyRelationFormatDefault, buildValueLabelColumns, expandExtendColumns } from './column-transforms';
import { enrichRelationTypes } from './relation-type';
import { buildSubResources } from './sub-resource.builder';

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
): Resource => {
  const rawColumns = expandExtendColumns(json.columns, dirPath);
  const columns = enrichRelationTypes(
    applyRelationFormatDefault(rawColumns) ?? rawColumns,
    schema,
  );
  injectEnumValues(columns, enums);

  const subResources = buildSubResources(
    columns,
    json.route,
    json.model,
    dirPath,
    enums,
    baseUrl,
  );
  const enrichedColumns =
    enrichResourceRefColumns(
      enrichActionColumns(columns, json.route, subResources, baseUrl),
      dirPath,
      baseUrl,
    ) ?? columns;

  const calculatedColumns: CalculatedColumn[] = json.calculatedColumns ?? [];

  const picked = pickByColumns(schema, enrichedColumns);
  const createSchema = pickByColumns(
    schema,
    enrichedColumns,
    (c) => !c.idField && c.createable !== false,
  );
  const updateSchema = pickByColumns(
    schema,
    enrichedColumns,
    (c) => !c.idField && c.updateable !== false,
  );
  let views = buildViews(schema, enrichedColumns);
  if (views && calculatedColumns.length) {
    views = {
      ...views,
      table: injectCalculatedColumns(views.table, calculatedColumns),
    };
    if (views.view) {
      views = {
        ...views,
        view: injectCalculatedColumnsToView(views.view, calculatedColumns),
      };
    }
  }

  const lookup = buildLookup(enrichedColumns);
  const enrichedInclude = enrichIncludeWithSort(json.include, enrichedColumns);

  const definition: ResourceDefinition = {
    ...(opWithSchema(json.operations.findAll, picked) && {
      findAll: opWithSchema(json.operations.findAll, picked)!,
    }),
    ...(opWithSchema(json.operations.findOne, picked) && {
      findOne: opWithSchema(json.operations.findOne, picked)!,
    }),
    ...(opWithSchema(json.operations.create, createSchema) && {
      create: opWithSchema(json.operations.create, createSchema)!,
    }),
    ...(opWithSchema(json.operations.update, updateSchema) && {
      update: opWithSchema(json.operations.update, updateSchema)!,
    }),
    ...(upsertOp(json.operations.upsert, createSchema) && {
      upsert: upsertOp(json.operations.upsert, createSchema)!,
    }),
    ...(json.operations.delete !== false && { delete: true }),
  };

  const display = {
    mode: json.display?.mode === 'page' ? 'page' : 'modal',
    customComponent: json.display?.customComponent ?? null,
  };

  return {
    name: json.name,
    route: json.route,
    model: json.model,
    tag: json.tag,
    display,
    ...(json.idType && { idType: json.idType }),
    ...(lookup?.key && lookup.key !== 'id' && { idField: lookup.key }),
    ...(json.database && { database: json.database }),
    ...(hooks && { hooks }),
    definition,
    ...(views && { views }),
    ...(lookup && { lookup }),
    ...(subResources.length && { subResources }),
    ...(calculatedColumns.length && { calculatedColumns }),
    ...(actions?.length && { actions }),
    ...(tableActions?.length && { tableActions }),
    ...(enrichedInclude?.length && { include: enrichedInclude }),
    ...(json.modalSize && { modalSize: json.modalSize }),
    ...(buildValueLabelColumns(enrichedColumns).length && {
      valueLabelColumns: buildValueLabelColumns(enrichedColumns),
    }),
  };
};

const buildLookup = (
  columns: JsonColumn[] | undefined,
): LookupConfig | undefined => {
  if (!columns) return undefined;

  const keyCol = columns.find((c) => c.idField);
  // Prefer explicit showInLookup, then fall back to first searchable column.
  // Never fall back to the id field — it's typically an integer and doesn't support `contains`.
  const labelCol =
    columns.find((c) => c.showInLookup) ?? columns.find((c) => c.searchable);

  if (!keyCol && !labelCol) return undefined;

  return {
    key: keyCol?.id ?? 'id',
    ...(labelCol && { label: labelCol.id }),
  };
};