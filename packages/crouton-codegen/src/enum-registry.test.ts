import { describe, expect, it } from 'vitest';

import { buildEnumRegistry, mergeEnumRegistry } from './enum-registry';
import type { DbModel } from './types';

const model = (fields: any[]): DbModel => ({
  prismaName: 'X', clientAccessor: 'x', hasCompositeId: false, fields,
});

describe('buildEnumRegistry', () => {
  it('collects used enums with humanized default labels', () => {
    const m = model([
      { name: 'kind', kind: 'enum', type: 'TextType', enumValues: ['original', 'editions_and_translations'], isList: false, isRequired: true, isId: false, isUnique: false, isUpdatedAt: false, hasDefault: false, isTimestamp: false },
      { name: 'title', kind: 'scalar', type: 'String', isList: false, isRequired: true, isId: false, isUnique: false, isUpdatedAt: false, hasDefault: false, isTimestamp: false },
    ]);
    expect(buildEnumRegistry([m])).toEqual({
      TextType: [
        { value: 'original', label: 'Original' },
        { value: 'editions_and_translations', label: 'Editions and translations' },
      ],
    });
  });
});

describe('mergeEnumRegistry', () => {
  it('preserves existing labels/order and appends new members; keeps existing-only enums', () => {
    const existing = {
      TextType: [{ value: 'original', label: 'Original (custom)' }],
      Legacy: [{ value: 'x', label: 'X' }],
    };
    const generated = {
      TextType: [
        { value: 'original', label: 'Original' },
        { value: 'translation', label: 'Translation' },
      ],
    };
    expect(mergeEnumRegistry(existing, generated)).toEqual({
      TextType: [
        { value: 'original', label: 'Original (custom)' }, // hand label preserved
        { value: 'translation', label: 'Translation' }, // new member appended
      ],
      Legacy: [{ value: 'x', label: 'X' }], // untouched
    });
  });
});
