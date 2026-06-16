import { describe, expect, it } from 'vitest';

import { classify, defaultRuleset } from './classify';
import type { DbModel, JsonColumn } from './types';

const model: DbModel = {
  prismaName: 'Text',
  clientAccessor: 'text',
  tableName: 'text',
  idField: 'id',
  idType: 'string',
  hasCompositeId: false,
  fields: [
    { name: 'id', kind: 'id', type: 'String', isList: false, isRequired: true, isId: true, isUnique: false, isUpdatedAt: false, hasDefault: true, isTimestamp: false },
    { name: 'title', kind: 'scalar', type: 'String', isList: false, isRequired: true, isId: false, isUnique: false, isUpdatedAt: false, hasDefault: false, isTimestamp: false },
    { name: 'kind', kind: 'enum', type: 'TextKind', isList: false, isRequired: true, isId: false, isUnique: false, isUpdatedAt: false, hasDefault: false, isTimestamp: false, enumValues: ['a', 'b'] },
    { name: 'author_id', kind: 'foreignKey', type: 'String', isList: false, isRequired: false, isId: false, isUnique: false, isUpdatedAt: false, hasDefault: false, isTimestamp: false },
    { name: 'author', kind: 'relation', type: 'Author', isList: false, isRequired: false, isId: false, isUnique: false, isUpdatedAt: false, hasDefault: false, isTimestamp: false, relationModel: 'Author', relationType: 'manyToOne' },
    { name: 'sources', kind: 'relation', type: 'Source', isList: true, isRequired: false, isId: false, isUnique: false, isUpdatedAt: false, hasDefault: false, isTimestamp: false, relationModel: 'Source', relationType: 'oneToMany' },
    { name: 'created_at', kind: 'scalar', type: 'DateTime', isList: false, isRequired: false, isId: false, isUnique: false, isUpdatedAt: false, hasDefault: true, isTimestamp: true },
  ],
};

const col = (d: ReturnType<typeof classify>, id: string) =>
  (d.config.columns as Record<string, Omit<JsonColumn, 'id'>>)[id];

describe('classify', () => {
  it('derives identity + operations + database + sidebar', () => {
    const d = classify(model, { database: 'docsdb' });
    expect(d.config.model).toBe('text');
    expect(d.config.tag).toBe('Text');
    expect(d.config.idType).toBe('string');
    expect(d.config.database).toBe('docsdb');
    expect(d.config.sidebar).toEqual({ hide: false });
    expect(d.config.operations.findAll).toBe(true);
  });

  it('hides id everywhere and marks idField', () => {
    const d = classify(model);
    expect(col(d, 'id')).toMatchObject({
      idField: true,
      hiddenInTable: true,
      hiddenInForm: true,
      hiddenInView: true,
    });
  });

  it('hides timestamps in table+form and disables editing', () => {
    const d = classify(model);
    expect(col(d, 'created_at')).toEqual({
      hiddenInTable: true,
      hiddenInForm: true,
      createable: false,
      updateable: false,
    });
  });

  it('hides foreign-key scalars', () => {
    const d = classify(model);
    expect(col(d, 'author_id')).toMatchObject({ hiddenInTable: true, hiddenInForm: true });
  });

  it('ignores relation fields by default (not added to the config)', () => {
    const d = classify(model);
    expect(col(d, 'author')).toBeUndefined();
    expect(col(d, 'sources')).toBeUndefined();
    expect(d.columnOrder).not.toContain('author');
    expect(d.unwiredRelations).toEqual([]);
  });

  it('includes relations when explicitly enabled', () => {
    const d = classify(model, {
      ruleset: { ...defaultRuleset(), includeRelations: true },
      resolveRelationResource: (m) => (m === 'Author' ? './resource.author.json' : undefined),
    });
    // Author resolves → relation control, hidden in table only
    expect(col(d, 'author')).toMatchObject({
      hiddenInTable: true,
      fieldInput: { format: 'relation', resource: './resource.author.json', relationType: 'manyToOne' },
    });
    // Source does not resolve → hidden everywhere + recorded as unwired
    expect(col(d, 'sources')).toEqual({ hiddenInTable: true, hiddenInForm: true, hiddenInView: true });
    expect(d.unwiredRelations).toEqual([{ field: 'sources', targetModel: 'Source' }]);
  });

  it('renders enums as a shared-enum reference + value/label envelope by default', () => {
    const d = classify(model);
    const kind = col(d, 'kind') as any;
    expect(kind).toMatchObject({
      displayKey: 'label',
      enum: 'TextKind',
      fieldInput: { type: 'select', options: { emitObject: true } },
    });
    // shared-enum mode does NOT inline the values list
    expect(kind.fieldInput.options.values).toBeUndefined();
  });

  it('inlines values (no enum ref) when sharedEnums is off', () => {
    const d = classify(model, { ruleset: { ...defaultRuleset(), sharedEnums: false } });
    const kind = col(d, 'kind') as any;
    expect(kind.enum).toBeUndefined();
    expect(kind.fieldInput.options.values).toEqual([
      { label: 'a', value: 'a' },
      { label: 'b', value: 'b' },
    ]);
    expect(kind.fieldInput.options.emitObject).toBe(true);
  });

  it('omits the value/label envelope when enumValueLabel is off', () => {
    const d = classify(model, { ruleset: { ...defaultRuleset(), enumValueLabel: false } });
    const kind = col(d, 'kind') as any;
    expect(kind.displayKey).toBeUndefined();
    expect((kind.fieldInput?.options ?? {}).emitObject).toBeUndefined();
  });

  it('gives plain scalars a typed control', () => {
    const d = classify(model);
    expect(col(d, 'title').fieldInput).toMatchObject({ type: 'text' });
  });
});
