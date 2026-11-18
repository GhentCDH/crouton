import { describe, expect, it } from 'vitest';

import { buildTableUiSchema } from './table-cell';

const elementFor = (ui: Record<string, unknown>, id: string) =>
  ((ui['elements'] ?? []) as Array<Record<string, unknown>>).find((el) =>
    (el['scope'] as string | undefined)?.endsWith(`/${id}`),
  );

describe('buildTableUiSchema – displayKey propagation', () => {
  it('emits displayKey on object (relation) cells', () => {
    const ui = buildTableUiSchema([
      {
        id: 'family',
        type: 'object',
        displayKey: 'name',
        relation: { resource: '../family/resource.json', type: 'manyToOne', foreignKey: 'familyId' },
      },
    ]);

    const el = elementFor(ui, 'family');
    expect(el?.['type']).toBe('RecordCell');
    const options = el?.['options'] as Record<string, unknown>;
    expect(options['displayKey']).toBe('name');
    // Legacy keyValue option stays available for text/boolean cells.
    expect(options['key']).toBe('name');
  });

  it('emits displayKey on non-object columns with a displayKey', () => {
    const ui = buildTableUiSchema([
      { id: 'meta', type: 'object', displayKey: 'label', fieldInput: { type: 'text' } },
    ]);

    const options = elementFor(ui, 'meta')?.['options'] as Record<string, unknown>;
    expect(options['displayKey']).toBe('label');
  });

  it('does not add displayKey when the column has none', () => {
    const ui = buildTableUiSchema([{ id: 'name', label: 'Name', fieldInput: { type: 'text' } }]);

    const options = elementFor(ui, 'name')?.['options'] as Record<string, unknown>;
    expect(options['displayKey']).toBeUndefined();
  });
});

describe('buildTableUiSchema – manyToOne declared on the FK column (#549)', () => {
  const fkCol = (relation: Record<string, unknown>) =>
    buildTableUiSchema([
      {
        id: 'textSelectionId',
        relation: { resource: '../textSelection/resource.json', type: 'manyToOne', foreignKey: 'textSelectionId', ...relation },
        fieldInput: { type: 'autocomplete' },
      },
    ]);
  const optionsOf = (ui: Record<string, unknown>) =>
    elementFor(ui, 'textSelectionId')?.['options'] as Record<string, unknown>;

  it('points the cell at the included relation object and forwards relation.displayKey', () => {
    const options = optionsOf(fkCol({ displayKey: 'text' }));
    expect(options['relationField']).toBe('textSelection');
    expect(options['displayKey']).toBe('text');
    expect(options['relationType']).toBe('manyToOne');
  });

  it('honours relation.prismaField over the naming heuristic', () => {
    expect(optionsOf(fkCol({ prismaField: 'selection' }))['relationField']).toBe('selection');
  });

  it('derives the relation field from snake_case FKs', () => {
    const ui = buildTableUiSchema([
      { id: 'author_id', relation: { resource: '../author/resource.json', type: 'manyToOne', foreignKey: 'author_id' } },
    ]);
    expect((elementFor(ui, 'author_id')?.['options'] as Record<string, unknown>)['relationField']).toBe('author');
  });

  it('leaves relation-field columns (id ≠ foreignKey) unchanged', () => {
    const ui = buildTableUiSchema([
      { id: 'author', relation: { resource: '../author/resource.json', type: 'manyToOne', foreignKey: 'authorId' } },
    ]);
    expect((elementFor(ui, 'author')?.['options'] as Record<string, unknown>)['relationField']).toBeUndefined();
  });
});
