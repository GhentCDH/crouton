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
