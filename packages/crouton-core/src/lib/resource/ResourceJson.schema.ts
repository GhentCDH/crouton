import { z } from 'zod';

import { CalculatedColumnSchema } from './CalculatedColumn.schema';
import { type JsonColumn, JsonColumnSchema } from './Column';
import { parseFieldInputOptions } from './FieldInput.schema';
import { LayoutSchema } from './Layout.schema';
import { ParentRefSchema } from './ParentRef.schema';
import { ResourceKindSchema } from './ResourceKind';
import { SidebarSchema } from './Sidebar.schema';
import { JsonActionSchema } from './TableAction.schema';
import { getResourceExtensions } from './extensions';
import { JsonIncludeEntrySchema } from './include.schema';
import { BASELINE_RESOURCE_VERSION } from './version';
import { JsonOperationsSchema } from '../data-source/Operations.schema';
import { SecuritySchema } from '../data-source/Security.schema';
import { labelFromId } from '../schema/label.helper';

// ── Shared primitives ────────────────────────────────────────────────

const JsonColumnsMapSchema = z.record(
  z.string(),
  JsonColumnSchema.omit({ id: true }).catchall(z.unknown()),
); // map form — key becomes `id`
export type JsonColumnsMap = z.infer<typeof JsonColumnsMapSchema>;
const ColumnsSchema = JsonColumnsMapSchema;

// ── Display / sidebar ────────────────────────────────────────────────

export const JsonDisplaySchema = z.object({
  mode: z.enum(['page', 'modal']).default('modal').describe('How a record opens when clicked. "modal" (default) opens a dialog; "page" navigates to a dedicated route.'),
  customComponent: z.string().nullable().optional().default(null).describe('Import path to a custom Vue component for the record detail view. When set, the default view is replaced.'),
});

export type JsonDisplay = z.infer<typeof JsonDisplaySchema>;

/** Normalise `columns` from either array or object-map form. */
export const normalizeColumns = (
  columns: JsonColumnsMap | undefined,
): JsonColumn[] | undefined => {
  if (!columns) return undefined;
  const raw: JsonColumn[] = Array.isArray(columns)
    ? columns
    : Object.entries(columns).map(([id, col]) => ({ id, ...col }));
  return raw.map((col) => ({
    ...col,
    label: col.label ?? labelFromId(col.id),
  }));
};

// ── Top-level resource.json ──────────────────────────────────────────

export const ResourceJsonShape = z.object({
  /**
   * URL of the generated JSON Schema, for editor autocomplete/validation. Declared so the
   * key is *allowed* (not stripped, and not flagged by the very schema it points at).
   * Ignored at runtime.
   */
  $schema: z.string().optional().describe('URL of the generated JSON Schema for editor autocomplete and validation. Ignored at runtime.'),
  schemaVersion: z.number().int().positive().optional().describe('resource.json shape version. Omit to use the baseline. Auto-migrated toward CURRENT_RESOURCE_VERSION on load in the dev environment.'),
  draft: z.boolean().optional().default(false).describe('When true, the resource is present in the repo but NOT loaded or served. Use for work-in-progress resources.'),
  /**
   * Where the data comes from. `prisma` (the default) is backed by a Prisma
   * model plus a `schema.ts`; `custom` is configuration only and the developer
   * supplies a `repository.ts`. See `./ResourceKind`.
   */
  kind: ResourceKindSchema,
  name: z.string().describe('Unique resource identifier. Used as the frontend form id and as the default route/id when those are not explicitly set.'),
  route: z.string().optional().describe('URL segment for generated API endpoints. Defaults to "name" when omitted.'),
  id: z.string().optional().describe('Internal resource id used in frontend routing. Defaults to "name" when omitted.'),
  /**
   * Prisma model name. Required when `kind` is `prisma` (enforced by the
   * refinement on `ResourceJsonSchema`), and must be absent when `kind` is
   * `custom` — there is no Prisma delegate to address.
   */
  model: z.string().optional().describe('Prisma model name. Required when kind is "prisma"; must be absent when kind is "custom".'),
  tag: z.string().optional().default('Crouton').describe('OpenAPI tag grouping for generated endpoints. Defaults to "Crouton".'),
  title: z.string().optional().describe('Human-readable title shown in the UI sidebar and page headers. Defaults to a title-cased version of "name".'),
  table: z.string().optional().describe('Database table name override. Defaults to the Prisma model\'s table name.'),
  idType: z.enum(['string', 'number']).optional().describe('Data type of the resource\'s primary key, used to coerce :id route params. Written by codegen from the Prisma model; defaults to "string".'),
  database: z.string().optional().describe('Name of the datasource this resource uses. Defaults to the project\'s default datasource.'),
  /**
   * Mount this resource under a parent route instead of at the top level —
   * see `./ParentRef.schema`. Only valid on a `kind: "custom"` resource.
   */
  parent: ParentRefSchema.optional().describe('Mount this resource under a parent route instead of at the top level. Only valid on kind:"custom" resources. See ParentRef for the full config.'),
  sidebar: SidebarSchema.default(SidebarSchema.parse({})).describe('Sidebar visibility and ordering config. Default: shown, alphabetically ordered, ungrouped.'),
  display: JsonDisplaySchema.default(JsonDisplaySchema.parse({})).describe('How records open when clicked. Default: modal dialog.'),
  security: SecuritySchema.optional().describe('Global security block applied to every operation unless overridden per-operation. Use per-operation security in the operations block for finer control.'),
  operations: JsonOperationsSchema.optional().describe('CRUD operation flags. Defaults: all true for "prisma" resources, all false for "custom" resources.'),
  columns: ColumnsSchema.optional().default(ColumnsSchema.parse({})).describe('Column definitions as an id-keyed map. Each key becomes the column id. Omit for a columnless resource.'),
  calculatedColumns: z.array(CalculatedColumnSchema).default([]).describe('Columns computed from raw SQL expressions. Not supported on "custom" resources.'),
  actions: z.array(JsonActionSchema).default([]).describe('Per-record row actions shown in the table. Each action receives the record id.'),
  tableActions: z.array(JsonActionSchema).default([]).describe('Global table-level actions with no record id. Shown as toolbar buttons.'),
  modalSize: z.enum(['xs', 'sm', 'lg', 'xl']).default('sm').describe('Width of the create/edit modal dialog. "xs", "sm" (default), "lg", or "xl".'),
  include: z.array(JsonIncludeEntrySchema).default([]).describe('Prisma relations to include when querying this resource. Plain string: "author" → include: { author: true }. Object: { relation: "textAuthor", include: ["author"] } for nested includes.'),
  layout: LayoutSchema.optional().describe('Explicit layout for generated views (form, view, table). When absent, source-order grid is used.'),
});

/**
 * Per-kind rules that a plain `z.object` cannot express.
 *
 * Implemented as a refinement rather than a `z.discriminatedUnion` on purpose:
 * `scripts/gen-resource-schema.mjs` runs `z.toJSONSchema(ResourceJsonShape)`
 * and needs a `z.object`, and a defaulted discriminator does not survive the
 * union. The generated JSON Schema is therefore permissive about these rules
 * while the loader enforces them.
 */
export const refineByKind = (
  obj: z.infer<typeof ResourceJsonShape>,
  ctx: z.RefinementCtx,
): void => {
  if (obj.kind === 'custom') {
    if (obj.model !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['model'],
        message:
          'A custom resource has no Prisma model. Remove "model" — data access comes from repository.ts.',
      });
    }
    if (obj.calculatedColumns?.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['calculatedColumns'],
        message:
          'calculatedColumns run raw SQL against a database table and are not supported on a custom resource. Compute the value in repository.ts instead.',
      });
    }
    for (const [id, col] of Object.entries(obj.columns ?? {})) {
      // A relation or autocomplete column's shape comes from the referenced
      // resource, not from this column.
      if (
        col.fieldInput?.format === 'relation' ||
        col.fieldInput?.type === 'autocomplete'
      ) {
        continue;
      }
      if (col.type === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['columns', id, 'type'],
          message: `Column "${id}" needs a "type": a custom resource has no schema.ts, so its json_schema is built from the column types.`,
        });
      }
    }
    if (obj.parent && obj.parent.param === 'id') {
      ctx.addIssue({
        code: 'custom',
        path: ['parent', 'param'],
        message:
          'parent.param cannot be "id" — that is the child\'s own id in /:id routes. Use something like "groupId".',
      });
    }
  } else if (obj.parent !== undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['parent'],
      message:
        '"parent" is only supported on a custom resource. A prisma resource is nested by declaring a relation column on its parent.',
    });
  }
  // "model required for prisma kind" moved to the Prisma adapter at load time —
  // a resource on a custom-adapter datasource may have no model and is still valid.
};

export const buildResourceJsonSchema = () => {
  const ext = getResourceExtensions();
  const extShape = Object.fromEntries(
    [...ext].map(([name, schema]) => [name, schema.optional()]),
  );
  // Cast back to ResourceJsonShape type so refineByKind and transform stay typed.
  // Extension keys are lifted off the top level into `extensions` in the transform.
  const shape = (
    ext.size ? ResourceJsonShape.extend(extShape) : ResourceJsonShape
  ) as unknown as typeof ResourceJsonShape;

  return z.preprocess(
    (raw) => {
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const obj = raw as Record<string, unknown>;
        // Only auto-derive kind='prisma' when a model is present and kind is unset.
        // A modelless resource no longer auto-derives to kind='custom' — set it
        // explicitly when you want the columns-based json_schema behavior.
        if (obj['kind'] === undefined && obj['model'] !== undefined) {
          return { ...obj, kind: 'prisma' };
        }
      }
      return raw;
    },
    shape.superRefine(refineByKind).transform((obj) => {
      const title = obj.title ?? labelFromId(obj.name);
      const schemaVersion = obj.schemaVersion ?? BASELINE_RESOURCE_VERSION;
      const defaultOps =
        obj.kind === 'custom'
          ? JsonOperationsSchema.parse({ findAll: false, findOne: false, create: false, update: false, patch: false, delete: false })
          : JsonOperationsSchema.parse({});
      return {
        title,
        ...obj,
        id: (obj.id ?? obj.name) as string,
        route: (obj.route ?? obj.id ?? obj.name ?? '') as string,
        schemaVersion,
        columns: normalizeColumns(obj.columns)?.map((col) => {
          const out = { ...col };
          if (out.fieldInput) out.fieldInput = parseFieldInputOptions(out.fieldInput);
          if (out.fieldView) out.fieldView = parseFieldInputOptions(out.fieldView);
          if (out.fieldTable) out.fieldTable = parseFieldInputOptions(out.fieldTable);
          return out;
        }),
        operations: obj.operations ?? defaultOps,
      };
    }),
  );
};

/** Convenience constant — reads the registry at call time via the builder. */
export const ResourceJsonSchema = buildResourceJsonSchema();

export type ResourceJson = z.infer<ReturnType<typeof buildResourceJsonSchema>> & {
  route: string;
};
export type ResourceJsonInput = z.input<typeof ResourceJsonShape> & {
  route: string;
};

export type ResourceConfig = ResourceJson;

/**
 * Generate a JSON Schema for resource.json that includes all currently-registered
 * extension keys. Call this after registering extensions to emit an app-specific
 * `resource.schema.json` that includes `annotation`, `context`, etc. as top-level
 * properties — enabling editor autocomplete for extension blocks.
 *
 * The core committed `resource.schema.json` is extension-agnostic (generated at
 * crouton-core build time when no extensions are registered). This helper lets
 * a consuming app emit its own schema after registering its extensions.
 */
export const generateResourceJsonSchema = (): Record<string, unknown> => {
  const ext = getResourceExtensions();
  const extShape = Object.fromEntries(
    [...ext].map(([name, schema]) => [name, schema.optional()]),
  );
  const shape = ext.size ? ResourceJsonShape.extend(extShape) : ResourceJsonShape;
  try {
    return z.toJSONSchema(shape, {
      target: 'draft-7',
      io: 'input',
      unrepresentable: 'any',
    }) as Record<string, unknown>;
  } catch {
    // ponytail: if toJSONSchema fails (recursive/record schema), fall back to the base shape.
    return z.toJSONSchema(ResourceJsonShape, {
      target: 'draft-7',
      io: 'input',
      unrepresentable: 'any',
    }) as Record<string, unknown>;
  }
};
