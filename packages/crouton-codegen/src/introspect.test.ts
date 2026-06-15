import { describe, expect, it } from 'vitest';

import { type Dmmf, dmmfToDbModels } from './introspect';

const f = (
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  over: Partial<import('./introspect').DmmfField> & { name: string },
) => {
  return {
    kind: 'scalar' as const,
    type: 'String',
    isList: false,
    isRequired: true,
    isId: false,
    isUnique: false,
    isUpdatedAt: false,
    hasDefaultValue: false,
    ...over,
  };
};

const dmmf: Dmmf = {
  datamodel: {
    enums: [
      {
        name: 'TextType',
        values: [{ name: 'original' }, { name: 'translation' }],
      },
    ],
    models: [
      {
        name: 'Text',
        dbName: 'text',
        primaryKey: null,
        fields: [
          f({ name: 'id', type: 'String', isId: true, hasDefaultValue: true }),
          f({ name: 'title', type: 'String' }),
          f({ name: 'text_type', kind: 'enum', type: 'TextType' }),
          f({ name: 'author_id', type: 'String', isRequired: false }),
          f({
            name: 'author',
            kind: 'object',
            type: 'Author',
            isRequired: false,
            relationName: 'TextToAuthor',
            relationFromFields: ['author_id'],
            relationToFields: ['id'],
          }),
          f({
            name: 'created_at',
            type: 'DateTime',
            isRequired: false,
            hasDefaultValue: true,
          }),
          f({
            name: 'updated_at',
            type: 'DateTime',
            isRequired: false,
            isUpdatedAt: true,
          }),
        ],
      },
      {
        name: 'Author',
        dbName: null,
        primaryKey: null,
        fields: [
          f({ name: 'id', type: 'Int', isId: true, hasDefaultValue: true }),
          f({ name: 'name', type: 'String' }),
          f({
            name: 'texts',
            kind: 'object',
            type: 'Text',
            isList: true,
            relationName: 'TextToAuthor',
          }),
        ],
      },
    ],
  },
};

describe('dmmfToDbModels', () => {
  const models = dmmfToDbModels(dmmf);
  const text = models.find((m) => m.prismaName === 'Text')!;
  const author = models.find((m) => m.prismaName === 'Author')!;
  const field = (m: typeof text, name: string) =>
    m.fields.find((x) => x.name === name)!;

  it('maps model identity', () => {
    expect(text.clientAccessor).toBe('text');
    expect(text.tableName).toBe('text');
    expect(text.idField).toBe('id');
    expect(text.idType).toBe('string');
    expect(author.idType).toBe('number');
  });

  it('classifies field kinds', () => {
    expect(field(text, 'id').kind).toBe('id');
    expect(field(text, 'title').kind).toBe('scalar');
    expect(field(text, 'text_type').kind).toBe('enum');
    expect(field(text, 'author_id').kind).toBe('foreignKey');
    expect(field(text, 'author').kind).toBe('relation');
  });

  it('detects timestamps (by name and by @updatedAt)', () => {
    expect(field(text, 'created_at').isTimestamp).toBe(true);
    expect(field(text, 'updated_at').isTimestamp).toBe(true);
    expect(field(text, 'title').isTimestamp).toBe(false);
  });

  it('resolves relation cardinality from the counterpart', () => {
    expect(field(text, 'author').relationType).toBe('manyToOne');
    expect(field(text, 'author').relationModel).toBe('Author');
    expect(field(author, 'texts').relationType).toBe('oneToMany');
  });

  it('extracts enum values', () => {
    expect(field(text, 'text_type').enumValues).toEqual([
      'original',
      'translation',
    ]);
  });
});
