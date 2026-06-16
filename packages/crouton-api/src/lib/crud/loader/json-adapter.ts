import { ZodArray, ZodNullable, type ZodObject, ZodOptional, type ZodRawShape } from 'zod';

import type { CalculatedColumn, JsonColumn, JsonResourceConfig, RelationType } from './json-config.types';
import { normalizeColumns } from './json-config.types';
import { opWithSchema, pickByColumns, upsertOp } from './schema.helpers';
import { buildViews, buildViewsFromColumns, injectCalculatedColumns, injectCalculatedColumnsToView } from './view.builders';
import type {
  LookupConfig,
  ResourceAction,
  ResourceConfig,
  ResourceDefinition,
  ResourceHooks,
  ResourceTableAction,
  SubResourceConfig,
  ValueLabelColumn,
} from '../crud.config';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

type ResolvedChildResource = { json: JsonResourceConfig; dir: string };

/**
 * Resolve `fieldInput.resource` (e.g. `"./author.resource"`) relative to the
 * parent resource's directory and return the child `resource.json` contents
 * AND the child's directory (needed so the child can resolve its own `extend` paths).
 *
 * Convention: `"./author.resource"` → sibling directory `author/resource.json`.
 */
const resolveChildResource = (
  resourcePath: string,
  parentDir: string,
): ResolvedChildResource | undefined => {
  // Direct .json file reference (e.g. "./resource.content.json") — resolve relative to parentDir itself
  const directPath = resolve(parentDir, resourcePath);
  if (resourcePath.endsWith('.json') && existsSync(directPath)) {
    try {
      return { json: JSON.parse(readFileSync(directPath, 'utf-8')) as JsonResourceConfig, dir: dirname(directPath) };
    } catch {
      return undefined;
    }
  }

  // Directory convention: "./author.resource" → sibling dir "author/resource.json"
  const childName = resourcePath.replace(/^\.\//, '').replace(/\.resource$/, '');
  const childJsonPath = resolve(dirname(parentDir), childName, 'resource.json');
  if (!existsSync(childJsonPath)) return undefined;
  try {
    return { json: JSON.parse(readFileSync(childJsonPath, 'utf-8')) as JsonResourceConfig, dir: dirname(childJsonPath) };
  } catch {
    return undefined;
  }
};

/**
 * Expand columns that declare `extend` into virtual sub-columns derived from the
 * referenced resource.json.
 *
 * Each non-id column in the referenced resource becomes a virtual column:
 *   id         → `{extendColId}_{refColId}`
 *   column     → the extending column's `column` value (or its `id`)
 *   displayKey → the referenced column's `displayKey` or its `id`
 *   label      → the referenced column's label
 *
 * Visibility is the union of the extending column's visibility and the referenced
 * column's own visibility — the more restrictive setting wins.
 * Optional `columns` map on the extending column lets you override individual sub-columns.
 */
const expandExtendColumns = (
  columns: JsonColumn[],
  dirPath: string | undefined,
): JsonColumn[] => {
  if (!dirPath) return columns;

  const result: JsonColumn[] = [];
  for (const col of columns) {
    if (!col.extend) {
      result.push(col);
      continue;
    }

    const resolved = resolveChildResource(col.extend, dirPath);
    if (!resolved) {
      console.warn(`[extend] Could not resolve "${col.extend}" for column "${col.id}" — keeping as-is`);
      result.push(col);
      continue;
    }

    const refColumns = normalizeColumns(resolved.json.columns) ?? [];
    const parentColumnKey = col.column ?? col.id;

    for (const refCol of refColumns) {
      // Skip primary key fields
      if (refCol.idField) continue;

      const virtualId = `${col.id}_${refCol.id}`;
      // When refCol has a displayKey (e.g. internal_author.displayKey = "name"), the value
      // lives at refCol.id.displayKey within the parent column object. Build the full dotted
      // path so scopes and table keys navigate correctly: "internal_author.name".
      // For plain scalar columns with no displayKey the path is just refCol.id.
      const displayKey = refCol.displayKey ? `${refCol.id}.${refCol.displayKey}` : refCol.id;

      // The more restrictive visibility wins (true = hidden beats false = visible)
      const hiddenInTable =
        col.hiddenInTable === true || refCol.hiddenInTable === true ? true : col.hiddenInTable ?? refCol.hiddenInTable;
      const hiddenInForm =
        col.hiddenInForm === true || refCol.hiddenInForm === true ? true : col.hiddenInForm ?? refCol.hiddenInForm;
      const hiddenInView =
        col.hiddenInView === true || refCol.hiddenInView === true ? true : col.hiddenInView ?? refCol.hiddenInView;

      // Per-sub-column overrides keyed by virtual id or ref column id
      const override = col.columns?.[virtualId] ?? col.columns?.[refCol.id] ?? {};

      const virtualCol: JsonColumn = {
        id: virtualId,
        column: parentColumnKey,
        displayKey,
        label: refCol.label ?? refCol.id,
        columnType: 'object',
        ...(hiddenInTable !== undefined && { hiddenInTable }),
        ...(hiddenInForm !== undefined && { hiddenInForm }),
        ...(hiddenInView !== undefined && { hiddenInView }),
        ...(refCol.sortable != null && { sortable: refCol.sortable }),
        ...(refCol.fieldInput && { fieldInput: refCol.fieldInput }),
        ...override,
      };

      result.push(virtualCol);
    }
  }

  return result;
};

/**
 * Collect columns that should be serialized as `{ value, label }`: those whose
 * `fieldInput.options.emitObject` is true and that carry an `options.values`
 * list (typically enum/select columns).
 */
const buildValueLabelColumns = (columns: JsonColumn[] | undefined): ValueLabelColumn[] =>
  (columns ?? []).flatMap((c) => {
    const opts = c.fieldInput?.options as
      | { emitObject?: boolean; values?: { value: unknown; label: string }[] }
      | undefined;
    if (!opts?.emitObject || !Array.isArray(opts.values)) return [];
    return [{ field: c.column ?? c.id, values: opts.values }];
  });

/**
 * Build `SubResourceConfig` entries for columns with `fieldInput.format === "action"`.
 */
const buildSubResources = (
  columns: JsonColumn[] | undefined,
  parentRoute: string,
  parentModel: string,
  parentDir?: string,
): SubResourceConfig[] => {
  if (!columns || !parentDir) return [];

  return columns
    .filter((c) => c.fieldInput?.format === 'relation' && c.fieldInput?.resource)
    .map((c) => {
      const childResolved = resolveChildResource(c.fieldInput!.resource!, parentDir);
      const childJson = childResolved?.json;
      const childDir = childResolved?.dir;
      const childRoute = childJson?.route ??
        c.fieldInput!.resource!.replace(/^\.\//, '').replace(/\.resource$/, '');

      const rawChildColumns = childJson ? normalizeColumns(childJson.columns) : undefined;
      const childColumns = rawChildColumns ? expandExtendColumns(rawChildColumns, childDir) : undefined;
      const childLookupKey = childColumns?.find((col) => col.idField)?.id ?? 'id';
      const childCalculatedColumns = childJson?.calculatedColumns ?? [];
      let childViews = childJson ? buildViewsFromColumns(childColumns) : undefined;
      if (childViews && childCalculatedColumns.length) {
        childViews = { ...childViews, table: injectCalculatedColumns(childViews.table, childCalculatedColumns) };
        if (childViews.view) {
          childViews = { ...childViews, view: injectCalculatedColumnsToView(childViews.view, childCalculatedColumns) };
        }
      }
      const childOps = childJson?.operations ?? {};

      return {
        column: c.id,
        relation: c.id,
        childRoute,
        childModel: c.id,
        foreignKey: `${parentModel}_id`,
        name: childJson?.name ?? childRoute,
        title: childJson?.title ?? childJson?.tag ?? childRoute,
        idField: childLookupKey,
        idType: childJson?.idType ?? 'string',
        ...(childViews && { views: childViews }),
        operations: {
          findAll: childOps.findAll !== false,
          findOne: childOps.findOne !== false,
          create: childOps.create !== false,
          update: childOps.update !== false,
          delete: childOps.delete !== false,
        },
        ...(childJson?.actions?.length && { actions: childJson.actions }),
        ...(childJson?.modalSize && { modalSize: childJson.modalSize }),
        ...(childJson?.include?.length && { include: childJson.include }),
        ...(childJson?.calculatedColumns?.length && { calculatedColumns: childJson.calculatedColumns }),
        ...((c.hiddenInForm === false || c.hiddenInView === false) && { includeInFindOne: true }),
        ...(buildValueLabelColumns(childColumns).length && {
          valueLabelColumns: buildValueLabelColumns(childColumns),
        }),
      } satisfies SubResourceConfig;
    });
};

/**
 * Return a new columns array with `uri`, `resourceUri`, and `schemasUri`
 * injected into `fieldInput.options` for relation columns.
 */
const enrichActionColumns = (
  columns: JsonColumn[] | undefined,
  parentRoute: string,
  subResources: SubResourceConfig[],
  baseUrl?: string,
): JsonColumn[] | undefined => {
  if (!columns) return columns;
  const base = baseUrl ?? '';
  return columns.map((col) => {
    if (col.fieldInput?.format !== 'relation') return col;
    const sub = subResources.find((s) => s.column === col.id);
    if (!sub) return col;
    return {
      ...col,
      fieldInput: {
        ...col.fieldInput,
        options: {
          ...(col.fieldInput.options as object | undefined),
          uri: `${base}/${parentRoute}/{id}/${sub.childRoute}`,
          resourceUri: `${base}/${sub.childRoute}`,
          ...(sub.views && { schemasUri: `${base}/${parentRoute}/${sub.childRoute}/schemas` }),
        },
      },
    };
  });
};

/**
 * Return a new columns array with `resourceUri`/`schemasUri` injected into
 * `fieldInput.options` for NON-relation columns that reference a resource file
 * (e.g. a select whose values come from another resource). Relation columns
 * are handled by `enrichActionColumns`.
 */
const enrichResourceRefColumns = (
  columns: JsonColumn[] | undefined,
  parentDir?: string,
  baseUrl?: string,
): JsonColumn[] | undefined => {
  if (!columns || !parentDir) return columns;
  const base = baseUrl ?? '';
  return columns.map((col) => {
    if (!col.fieldInput?.resource || col.fieldInput.format === 'relation') return col;
    const childResolved = resolveChildResource(col.fieldInput.resource, parentDir);
    const childRoute =
      childResolved?.json?.route ??
      col.fieldInput.resource.replace(/^\.\//, '').replace(/\.resource$/, '');
    return {
      ...col,
      fieldInput: {
        ...col.fieldInput,
        options: {
          ...(col.fieldInput.options as object | undefined),
          resourceUri: `${base}/${childRoute}`,
          schemasUri: `${base}/${childRoute}/schemas`,
        },
      },
    };
  });
};

export const fromJson = (
  json: JsonResourceConfig,
  schema: ZodObject<ZodRawShape> | undefined,
  hooks: ResourceHooks | undefined,
  /** Absolute path to the resource directory (needed to resolve sibling resources). */
  dirPath?: string,
  /** Base URL for generating full URIs in column options (e.g. `http://localhost:3000`). */
  baseUrl?: string,
  /** Resolved action procedures loaded from the `actions/` directory. */
  actions?: ResourceAction[],
  /** Resolved table-level action procedures loaded from the `actions/` directory. */
  tableActions?: ResourceTableAction[],
): ResourceConfig => {
  const rawColumns = expandExtendColumns(normalizeColumns(json.columns) ?? [], dirPath);
  const columns = enrichRelationTypes(rawColumns, schema);

  const subResources = buildSubResources(columns, json.route, json.model, dirPath);
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
    views = { ...views, table: injectCalculatedColumns(views.table, calculatedColumns) };
    if (views.view) {
      views = { ...views, view: injectCalculatedColumnsToView(views.view, calculatedColumns) };
    }
  }

  const lookup = buildLookup(enrichedColumns);

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

  return {
    name: json.name,
    route: json.route,
    model: json.model,
    tag: json.tag,
    ...(json.title && { title: json.title }),
    ...(json.sidebar && { sidebar: json.sidebar }),
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
    ...(json.include?.length && { include: json.include }),
    ...(json.modalSize && { modalSize: json.modalSize }),
    ...(buildValueLabelColumns(enrichedColumns).length && {
      valueLabelColumns: buildValueLabelColumns(enrichedColumns),
    }),
  };
};

// ─── Relation type derivation ─────────────────────────────────────────────────

/** Recursively unwrap Optional / Nullable wrappers to reach the inner Zod type. */
const unwrapZodType = (type: any): any => {
  if (type instanceof ZodOptional || type instanceof ZodNullable) {
    return unwrapZodType(type.unwrap());
  }
  return type;
};

/**
 * Derive the `RelationType` for a column from the Zod schema field:
 * - `ZodArray`  → `'oneToMany'`
 * - `ZodObject` → `'manyToOne'` (embedded single record)
 * - scalar (number / string FK) → `'manyToOne'`
 * - absent from schema → `undefined` (can't determine)
 */
const deriveRelationType = (
  schema: ZodObject<ZodRawShape> | undefined,
  columnId: string,
): RelationType | undefined => {
  if (!schema) return undefined;
  const field = schema.shape[columnId];
  if (!field) return undefined;
  const inner = unwrapZodType(field);
  return inner instanceof ZodArray ? 'oneToMany' : 'manyToOne';
};

/**
 * Enrich columns that declare a relation `fieldInput` (type `"autocomplete"` or
 * format `"relation"`) with a `relationType` derived from the Zod schema,
 * **unless** the column already has an explicit `relationType` set.
 */
const enrichRelationTypes = (
  columns: JsonColumn[],
  schema: ZodObject<ZodRawShape> | undefined,
): JsonColumn[] => {
  if (!schema) return columns;
  return columns.map((col) => {
    const fi = col.fieldInput;
    if (!fi) return col;
    const isRelationField = fi.type === 'autocomplete' || fi.format === 'relation';
    if (!isRelationField) return col;
    if (fi.relationType) return col; // explicit wins
    const derived = deriveRelationType(schema, col.id);
    if (!derived) return col;
    return { ...col, fieldInput: { ...fi, relationType: derived } };
  });
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
