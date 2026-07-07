/**
 * Core data model for the resource generator.
 *
 * The engine is split into pure stages:
 *   introspect → classify → diff → resolve → apply → commit
 *
 * Everything here is framework-agnostic and serializable so the same engine can
 * drive an interactive CLI and a backend dev-mode endpoint.
 */

import { type JsonColumnInput, type JsonResourceOperationsInput, type RelationType, type ResourceJsonInput } from '@ghentcdh/crouton-core';

// ─── introspect: normalized DB model ─────────────────────────────────────────

export type DbFieldKind =
  | 'id' // primary key
  | 'scalar' // plain scalar column
  | 'enum' // enum-backed scalar
  | 'relation' // object/relation field (no column of its own)
  | 'foreignKey'; // scalar column that backs a relation (relationFromFields)

export interface DbField {
  /** Prisma/DB field name. */
  name: string;
  kind: DbFieldKind;
  /** Prisma type: `String`, `Int`, `DateTime`, an enum name, or a related model. */
  type: string;
  isList: boolean;
  isRequired: boolean;
  isId: boolean;
  isUnique: boolean;
  /** `@updatedAt` attribute present. */
  isUpdatedAt: boolean;
  hasDefault: boolean;
  /** Detected created/updated timestamp (by attribute or name + DateTime type). */
  isTimestamp: boolean;

  // relation metadata (kind === 'relation')
  relationName?: string;
  /** Target Prisma model name for a relation field. */
  relationModel?: string;
  /** Cardinality, resolved against the counterpart side. */
  relationType?: RelationType;
  /** Scalar fields on this model that back the relation (FK columns). */
  relationFromFields?: string[];
  relationToFields?: string[];

  /** Enum values (kind === 'enum'). */
  enumValues?: string[];
}

export interface DbModel {
  /** Prisma model name as declared (e.g. `Language`, `metadata_config`). */
  prismaName: string;
  /** PrismaClient accessor — the `model` field in resource.json (camel-first). */
  clientAccessor: string;
  /** `@@map` table name, if any. */
  tableName?: string;
  /** Primary key field name (undefined for composite / missing PK). */
  idField?: string;
  idType?: 'string' | 'number';
  /** True when the model uses a composite `@@id`. */
  hasCompositeId: boolean;
  fields: DbField[];
}

// ─── classify: ruleset + draft ───────────────────────────────────────────────

export interface Ruleset {
  /** Hide primary key in the table (and form/view). Default true. */
  hideIdInTable: boolean;
  hideIdInForm: boolean;
  hideIdInView: boolean;
  /** Hide created/updated timestamps in table + form, mark non-editable. Default true. */
  hideTimestamps: boolean;
  /** Hide FK scalar columns + mark non-editable. Default true. */
  hideForeignKeys: boolean;
  /**
   * Whether to emit relation (object) fields as columns at all. Default false:
   * relations are ignored entirely and never written to resource.json (they are
   * not real DB columns and can't be sorted/queried like scalars). Set true to
   * generate hidden relation columns.
   */
  includeRelations: boolean;
  /** Hide relation fields in the table (only relevant when `includeRelations`). Default true. */
  hideRelationsInTable: boolean;
  /**
   * When false, relation fields are also hidden in form/view.
   * When true (default), relations are shown in form/view only if the target
   * resource exists; otherwise they are hidden everywhere.
   * (Only relevant when `includeRelations` is true.)
   */
  showRelationsInForm: boolean;
  /**
   * Emit enum/select columns as a `{ value, label }` envelope: sets
   * `fieldInput.options.emitObject` + `displayKey: 'label'` so the API returns
   * the label-aware object and the table/view renders the label. Default true.
   */
  enumValueLabel: boolean;
  /**
   * Emit enum columns as a `enum: "<Name>"` reference into the shared project
   * registry (`crouton.enums.json`) instead of inlining the `values` list, and
   * maintain that registry. Default true.
   */
  sharedEnums: boolean;
  /** Operations enabled on a freshly generated resource. */
  defaultOperations: JsonResourceOperationsInput;
}

/**
 * A fully generated resource config (the "ideal" output for a model given the
 * current DB schema + ruleset). `diff` reconciles this against what's on disk.
 */
export interface ResourceDraft {
  /** Directory / route name. */
  name: string;
  /** Prisma model name (needed for the generated schema.ts export name). */
  prismaName: string;
  config: ResourceJsonInput;
  /**
   * Whether the model has any relation (object) fields. zod-prisma-types only
   * emits a `…WithRelationsSchema` for models that have relations, so the
   * generated `schema.ts` must fall back to the plain `…Schema` otherwise.
   */
  hasRelations: boolean;
  /** Column ids in generation order (columns map has no guaranteed order in JSON). */
  columnOrder: string[];
  /** Relations whose target resource does not (yet) exist — left hidden. */
  unwiredRelations: { field: string; targetModel: string }[];
}

// ─── diff: decisions ─────────────────────────────────────────────────────────

export type DecisionKind =
  'addToSidebar' | 'addColumn' | 'removeColumn' | 'reconcileColumn';

export interface Decision {
  /** Stable id, e.g. `add:email`, `reconcile:title`, `sidebar`. */
  id: string;
  kind: DecisionKind;
  /** Column field name (absent for `addToSidebar`). */
  field?: string;
  /** Recommended choice — used as the default by any resolver. */
  recommended: string;
  /** Allowed choices in display order. */
  options: string[];
  /** Human context for prompts (e.g. "type changed: String → Int"). */
  context?: string;
}

export interface ResourceDiff {
  /** Directory / route name. */
  name: string;
  /** PrismaClient accessor (resource.json `model`). */
  model: string;
  isNew: boolean;
  decisions: Decision[];
  /** Carried forward to `apply`. */
  draft: ResourceDraft;
  /** Parsed existing resource.json, if any. */
  existing?: ResourceJsonInput;
  /** True when a sibling schema.ts already exists. */
  hasSchemaFile: boolean;
}

export interface Resolution {
  decisionId: string;
  choice: string;
  /** Optional free-form value for future decisions (e.g. a renamed route). */
  value?: string;
}

export interface ResolvedDiff {
  diff: ResourceDiff;
  resolutions: Map<string, string>;
}

// ─── apply: write plan ───────────────────────────────────────────────────────

export interface FileWrite {
  /** Absolute or project-relative path. */
  path: string;
  contents: string;
  action: 'create' | 'update';
}

export interface WritePlan {
  resource: string;
  files: FileWrite[];
  /** Notes surfaced to the user (e.g. unwired relations, composite-id warnings). */
  notes: string[];
}

export type { JsonColumnInput as JsonColumn, RelationType, ResourceJsonInput as ResourceJson };
