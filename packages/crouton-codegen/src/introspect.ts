/**
 * introspect: Prisma schema → normalized `DbModel[]`.
 *
 * The pure normalizer `dmmfToDbModels` is separated from the Prisma call so it
 * can be unit-tested with a hand-built DMMF and so a Prisma version bump only
 * touches `loadDmmf`.
 */

import { idTypeFor, isTimestampField } from './naming';
import type { DbField, DbFieldKind, DbModel, RelationType } from './types';

// ─── Minimal DMMF shapes (only what we consume) ──────────────────────────────

export interface DmmfField {
  name: string;
  kind: 'scalar' | 'object' | 'enum' | 'unsupported';
  type: string;
  isList: boolean;
  isRequired: boolean;
  isId: boolean;
  isUnique: boolean;
  isUpdatedAt: boolean;
  hasDefaultValue: boolean;
  relationName?: string;
  relationFromFields?: string[];
  relationToFields?: string[];
}

export interface DmmfModel {
  name: string;
  dbName?: string | null;
  primaryKey?: { name?: string | null; fields: string[] } | null;
  fields: DmmfField[];
}

export interface DmmfEnum {
  name: string;
  values: { name: string }[];
}

export interface DmmfDatamodel {
  models: DmmfModel[];
  enums: DmmfEnum[];
}

export interface Dmmf {
  datamodel: DmmfDatamodel;
}

// ─── relation cardinality ────────────────────────────────────────────────────

interface RelationSide {
  model: string;
  isList: boolean;
}

/** Index relation fields by `relationName` so each side can see its counterpart. */
const indexRelations = (models: DmmfModel[]): Map<string, RelationSide[]> => {
  const index = new Map<string, RelationSide[]>();
  for (const model of models) {
    for (const field of model.fields) {
      if (field.kind !== 'object' || !field.relationName) continue;
      const list = index.get(field.relationName) ?? [];
      list.push({ model: model.name, isList: field.isList });
      index.set(field.relationName, list);
    }
  }
  return index;
};

const resolveRelationType = (
  field: DmmfField,
  index: Map<string, RelationSide[]>,
): RelationType => {
  const sides = field.relationName ? index.get(field.relationName) ?? [] : [];
  // Counterpart = the side declared on the related model (`field.type`).
  // (For self-relations both sides share a model; fall back to any other side.)
  const counterpart =
    sides.find((s) => s.model === field.type) ?? sides.find((s) => s.isList !== field.isList);
  const otherIsList = counterpart?.isList ?? false;
  if (field.isList) return otherIsList ? 'manyToMany' : 'oneToMany';
  return otherIsList ? 'manyToOne' : 'oneToOne';
};

// ─── normalizer ──────────────────────────────────────────────────────────────

/** Pure: DMMF datamodel → normalized `DbModel[]`. */
export const dmmfToDbModels = (dmmf: Dmmf): DbModel[] => {
  const { models, enums } = dmmf.datamodel;
  const enumNames = new Set(enums.map((e) => e.name));
  const relationIndex = indexRelations(models);

  return models.map((model) => {
    // FK scalar columns = every scalar referenced by a relation's relationFromFields.
    const fkFields = new Set<string>();
    for (const f of model.fields) {
      if (f.kind === 'object' && f.relationFromFields) {
        for (const name of f.relationFromFields) fkFields.add(name);
      }
    }

    const idFieldDef = model.fields.find((f) => f.isId);
    const hasCompositeId = !!model.primaryKey && model.primaryKey.fields.length > 1;
    const idField = idFieldDef?.name;
    const idType = idFieldDef ? idTypeFor(idFieldDef.type) : undefined;

    const fields: DbField[] = model.fields.map((f) => {
      const isEnum = f.kind === 'enum' || enumNames.has(f.type);
      let kind: DbFieldKind;
      if (f.isId) kind = 'id';
      else if (f.kind === 'object') kind = 'relation';
      else if (fkFields.has(f.name)) kind = 'foreignKey';
      else if (isEnum) kind = 'enum';
      else kind = 'scalar';

      const field: DbField = {
        name: f.name,
        kind,
        type: f.type,
        isList: f.isList,
        isRequired: f.isRequired,
        isId: f.isId,
        isUnique: f.isUnique,
        isUpdatedAt: f.isUpdatedAt,
        hasDefault: f.hasDefaultValue,
        isTimestamp:
          kind === 'scalar' &&
          isTimestampField({ name: f.name, type: f.type, isUpdatedAt: f.isUpdatedAt }),
      };

      if (kind === 'relation') {
        field.relationName = f.relationName;
        field.relationModel = f.type;
        field.relationFromFields = f.relationFromFields;
        field.relationToFields = f.relationToFields;
        field.relationType = resolveRelationType(f, relationIndex);
      }
      if (isEnum) {
        field.enumValues = enums.find((e) => e.name === f.type)?.values.map((v) => v.name);
      }
      return field;
    });

    return {
      prismaName: model.name,
      clientAccessor: model.name.charAt(0).toLowerCase() + model.name.slice(1),
      tableName: model.dbName ?? undefined,
      idField,
      idType,
      hasCompositeId,
      fields,
    };
  });
};

// ─── Prisma loader (impure, lazy) ────────────────────────────────────────────

export type DmmfLoader = (schemaPath: string) => Promise<Dmmf>;

interface PrismaInternals {
  getSchemaWithPath: (opts: {
    schemaPath: { cliProvidedPath: string };
  }) => Promise<{ schemas: [string, string][] }>;
  getDMMF: (opts: { datamodel: [string, string][] }) => Promise<Dmmf>;
}

/**
 * Default loader: lazily imports `@prisma/internals` (resolved from the consumer
 * project's Prisma install) and parses the schema file. The import specifier is
 * indirected through a variable so a TypeScript build does not require
 * `@prisma/internals` to be installed in the crouton workspace. Kept out of the
 * pure path so tests can inject a fake.
 */
export const loadDmmf: DmmfLoader = async (schemaPath: string) => {
  const specifier = '@prisma/internals';
  let internals: PrismaInternals;
  try {
    // `@prisma/internals` is CommonJS: under Node ESM its API lands on
    // `.default`, while bundler/TS interop may expose it directly — handle both.
    const mod = (await import(specifier)) as { default?: PrismaInternals } & PrismaInternals;
    internals = (mod.default ?? mod) as PrismaInternals;
  } catch {
    throw new Error(
      'Could not load \'@prisma/internals\'. Ensure Prisma is installed in the project ' +
        '(it ships with the `prisma` CLI / `@prisma/client`).',
    );
  }
  const loaded = await internals.getSchemaWithPath({
    schemaPath: { cliProvidedPath: schemaPath },
  });
  return internals.getDMMF({ datamodel: loaded.schemas });
};

export interface IntrospectOptions {
  schemaPath: string;
  loader?: DmmfLoader;
}

/** Read + normalize a Prisma schema into `DbModel[]`. */
export const introspect = async (opts: IntrospectOptions): Promise<DbModel[]> => {
  const loader = opts.loader ?? loadDmmf;
  const dmmf = await loader(opts.schemaPath);
  return dmmfToDbModels(dmmf);
};
