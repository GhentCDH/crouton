import { z } from 'zod';

import { CalculatedColumnSchema } from './CalculatedColumn.schema';
import { type JsonColumn, JsonColumnSchema } from './Column';
import { ParentRefSchema } from './ParentRef.schema';
import { ResourceKindSchema } from './ResourceKind';
import { SidebarSchema } from './Sidebar.schema';
import { JsonActionSchema } from './TableAction.schema';
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

const JsonDisplaySchema = z.object({
  mode: z.enum(['page', 'modal']).default('modal'), // default: 'modal'
  customComponent: z.string().nullable().optional().default(null), // default: null
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
  $schema: z.string().optional(),
  /**
   * resource.json shape version. Missing ⇒ baseline (see `./version`). Auto-migrated
   * toward `CURRENT_RESOURCE_VERSION` on load in the dev environment.
   */
  schemaVersion: z.number().int().positive().optional(),
  /** When `true`, the resource lives in the repo but is NOT loaded/served (work in progress). */
  draft: z.boolean().optional().default(false),
  /**
   * Where the data comes from. `prisma` (the default) is backed by a Prisma
   * model plus a `schema.ts`; `custom` is configuration only and the developer
   * supplies a `repository.ts`. See `./ResourceKind`.
   */
  kind: ResourceKindSchema,
  name: z.string(), // required — unique id, used as the frontend form id
  route: z.string().optional(), //  URL segment for generated endpoints - default id is used
  id: z.string().optional(), //  URL segment for generated endpoints - default id is used
  /**
   * Prisma model name. Required when `kind` is `prisma` (enforced by the
   * refinement on `ResourceJsonSchema`), and must be absent when `kind` is
   * `custom` — there is no Prisma delegate to address.
   */
  model: z.string().optional(),
  tag: z.string().optional(), // required — OpenAPI tag
  title: z.string().optional(), // no computed default — used as UI display title
  table: z.string().optional(), // default: same as `model`
  /**
   * Type of the resource's primary key, used to coerce `:id` route params.
   * Written by codegen from the Prisma model; defaults to `'string'`.
   */
  idType: z.enum(['string', 'number']).optional(),
  database: z.string().optional(), // default: project's default data source
  /**
   * Mount this resource under a parent route instead of at the top level —
   * see `./ParentRef.schema`. Only valid on a `kind: "custom"` resource.
   */
  parent: ParentRefSchema.optional(),
  sidebar: SidebarSchema.default(SidebarSchema.parse({})), // default: shown, alphabetically ordered, ungrouped
  display: JsonDisplaySchema.default(JsonDisplaySchema.parse({})), // default: { mode: 'modal', customComponent: null }
  /** Global security block — applies to every operation unless overridden per-operation. */
  security: SecuritySchema.optional(),
  operations: JsonOperationsSchema.optional().default(
    JsonOperationsSchema.parse({}),
  ), // required key — but every sub-field defaults to enabled
  columns: ColumnsSchema.optional().default(ColumnsSchema.parse({})), //  id-keyed map; omit for a columnless resource
  calculatedColumns: z.array(CalculatedColumnSchema).default([]),
  actions: z.array(JsonActionSchema).default([]),
  /** Global table-level actions (no record id). Shown as toolbar buttons. */
  tableActions: z.array(JsonActionSchema).default([]),
  /** Modal width when opening a form for this resource. */
  modalSize: z.enum(['xs', 'sm', 'lg', 'xl']).default('sm'), // default: 'sm' for create/edit modal
  /**
   * Relations to include when querying this resource.
   * Each entry is either a plain relation name (`"author"` → `include: { author: true }`)
   * or an object for nested includes:
   * `{ "relation": "text_author", "include": ["author"] }` →
   *   `include: { text_author: { include: { author: true } } }`
   */
  include: z.array(JsonIncludeEntrySchema).default([]),
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
  } else if (obj.model === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['model'],
      message:
        '"model" is required for a prisma-backed resource. Set "kind": "custom" for a resource with no Prisma model.',
    });
  }
};

export const ResourceJsonSchema = z.preprocess(
  (raw) => {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const obj = raw as Record<string, unknown>;
      if (obj['kind'] === undefined) {
        return { ...obj, kind: obj['model'] !== undefined ? 'prisma' : 'custom' };
      }
    }
    return raw;
  },
  ResourceJsonShape.superRefine(refineByKind).transform((obj) => {
    const title = obj.title ?? labelFromId(obj.name);
    const schemaVersion = obj.schemaVersion ?? BASELINE_RESOURCE_VERSION;

    return {
      title,
      ...obj,
      route: (obj.route ?? obj.id ?? obj.name ?? '') as string,
      schemaVersion,
      columns: normalizeColumns(obj.columns),
    };
  }),
);

export type ResourceJson = z.infer<typeof ResourceJsonSchema> & {
  route: string;
};
export type ResourceJsonInput = z.input<typeof ResourceJsonShape> & {
  route: string;
};

export type ResourceConfig = ResourceJson;
