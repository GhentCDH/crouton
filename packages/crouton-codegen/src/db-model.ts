/** Normalized DB model produced by the `introspect` stage. */

import type { RelationType } from '@ghentcdh/crouton-core';

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
  /**
   * The literal value of a `@default(...)` when it's a plain scalar/array
   * (string, number, boolean, or array of those) rather than a function call
   * like `autoincrement()`, `now()`, `uuid()`, `cuid()`, or `dbgenerated(...)`.
   * Undefined when there's no default, or the default isn't representable as
   * a literal. Carried into `fieldInput.defaultValue` by `classify`.
   */
  defaultValue?: string | number | boolean | (string | number | boolean)[];
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