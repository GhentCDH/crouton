import { describe, expect, it, vi } from 'vitest';

import { invalid } from '../../testing/index';
import type { JsonColumn } from '../resource';
import { applyEnumDefaults, injectEnumValues } from './enum-registry';

const registry = {
  bookStatus: [
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
  ],
};

const enumCol = (): JsonColumn => invalid<JsonColumn>({ id: 'status', type: 'string', enum: 'bookStatus' });

const fi = (col: JsonColumn): NonNullable<JsonColumn['fieldInput']> => {
  if (!col.fieldInput) throw new Error('fieldInput expected');
  return col.fieldInput;
};

describe('applyEnumDefaults', () => {
  it('sets fieldInput.type = select when absent', () => {
    const col = enumCol();
    applyEnumDefaults(col);
    expect(fi(col).type).toBe('select');
  });

  it('sets fieldInput.type = select when fieldInput exists without type', () => {
    const col: JsonColumn = { ...enumCol(), fieldInput: invalid<JsonColumn['fieldInput']>({ position: 0 }) };
    applyEnumDefaults(col);
    expect(fi(col).type).toBe('select');
  });

  it('respects existing fieldInput.type', () => {
    const col: JsonColumn = { ...enumCol(), fieldInput: invalid<JsonColumn['fieldInput']>({ type: 'multiSelect' }) };
    applyEnumDefaults(col);
    expect(fi(col).type).toBe('multiSelect');
  });

  it('defaults emitObject: true', () => {
    const col = enumCol();
    applyEnumDefaults(col);
    expect((fi(col).options as Record<string, unknown>)['emitObject']).toBe(true);
  });

  it('defaults labelKey: label', () => {
    const col = enumCol();
    applyEnumDefaults(col);
    expect((fi(col).options as Record<string, unknown>)['labelKey']).toBe('label');
  });

  it('defaults valueKey: value', () => {
    const col = enumCol();
    applyEnumDefaults(col);
    expect((fi(col).options as Record<string, unknown>)['valueKey']).toBe('value');
  });

  it('sets col.displayKey = label when emitObject is true', () => {
    const col = enumCol();
    applyEnumDefaults(col);
    expect(col.displayKey).toBe('label');
  });

  it('does not set col.displayKey when emitObject: false', () => {
    const col: JsonColumn = {
      ...enumCol(),
      fieldInput: invalid<JsonColumn['fieldInput']>({ type: 'select', options: { emitObject: false } }),
    };
    applyEnumDefaults(col);
    expect(col.displayKey).toBeUndefined();
  });

  it('respects explicit emitObject: false', () => {
    const col: JsonColumn = {
      ...enumCol(),
      fieldInput: invalid<JsonColumn['fieldInput']>({ type: 'select', options: { emitObject: false } }),
    };
    applyEnumDefaults(col);
    expect((fi(col).options as Record<string, unknown>)['emitObject']).toBe(false);
  });

  it('respects existing col.displayKey', () => {
    const col: JsonColumn = { ...enumCol(), displayKey: 'value' };
    applyEnumDefaults(col);
    expect(col.displayKey).toBe('value');
  });

  it('injects values when provided', () => {
    const col = enumCol();
    applyEnumDefaults(col, registry.bookStatus);
    expect((fi(col).options as Record<string, unknown>)['values']).toEqual(registry.bookStatus);
  });

  it('does not set values when not provided (unknown enum)', () => {
    const col = enumCol();
    applyEnumDefaults(col, undefined);
    expect((fi(col).options as Record<string, unknown>)['values']).toBeUndefined();
  });

  it('respects explicit options.values override', () => {
    const custom = [{ value: 'x', label: 'X' }];
    const col: JsonColumn = {
      ...enumCol(),
      fieldInput: invalid<JsonColumn['fieldInput']>({ type: 'select', options: { values: custom } }),
    };
    applyEnumDefaults(col, registry.bookStatus);
    expect((fi(col).options as Record<string, unknown>)['values']).toEqual(custom);
  });
});

describe('injectEnumValues', () => {
  it('applies defaults for all enum columns', () => {
    const col = enumCol();
    injectEnumValues([col], registry);
    expect(fi(col).type).toBe('select');
    expect((fi(col).options as Record<string, unknown>)['emitObject']).toBe(true);
    expect((fi(col).options as Record<string, unknown>)['labelKey']).toBe('label');
    expect((fi(col).options as Record<string, unknown>)['values']).toEqual(registry.bookStatus);
    expect(col.displayKey).toBe('label');
  });

  it('warns and applies defaults (without values) for unknown enum', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const col = invalid<JsonColumn>({ id: 'foo', type: 'string', enum: 'unknownEnum' });
    injectEnumValues([col], registry);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknownEnum'));
    expect(fi(col).type).toBe('select');
    expect((fi(col).options as Record<string, unknown>)['values']).toBeUndefined();
    warnSpy.mockRestore();
  });

  it('skips columns with no enum ref', () => {
    const col = invalid<JsonColumn>({ id: 'name', type: 'string' });
    injectEnumValues([col], registry);
    expect(col.fieldInput).toBeUndefined();
  });

  it('handles undefined columns gracefully', () => {
    expect(() => injectEnumValues(undefined, registry)).not.toThrow();
  });
});

describe('injectEnumValues with a local values restriction (enum + values)', () => {
  const originRegistry = {
    author_origin_enum: [
      { value: 'internal', label: 'Internal' },
      { value: 'wikidata', label: 'Wikidata' },
      { value: 'trismegistus', label: 'Trismegistus' },
      { value: 'syriaca', label: 'Syriaca' },
    ],
  };

  const originCol = (values: unknown[]): JsonColumn =>
    invalid<JsonColumn>({
      id: 'origin',
      type: 'string',
      enum: 'author_origin_enum',
      displayKey: 'label',
      fieldInput: invalid<JsonColumn['fieldInput']>({
        type: 'select',
        options: { storeValue: true, emitObject: true, values },
      }),
    });

  const actualValues = (col: JsonColumn) =>
    (fi(col).options as Record<string, unknown>)['values'];

  it('resolves plain string entries into { value, label } from the registry', () => {
    const col = originCol(['internal', 'wikidata']);
    injectEnumValues([col], originRegistry);
    expect(actualValues(col)).toEqual([
      { value: 'internal', label: 'Internal' },
      { value: 'wikidata', label: 'Wikidata' },
    ]);
    // Restriction wins: the rest of the enum is not injected
    expect(actualValues(col)).toHaveLength(2);
    // The full enum is kept for label resolution of values outside the restriction
    expect((fi(col).options as Record<string, unknown>)['displayValues']).toEqual(
      originRegistry.author_origin_enum,
    );
  });

  it('keeps subset order and other option keys intact', () => {
    const col = originCol(['syriaca', 'internal']);
    injectEnumValues([col], originRegistry);
    expect(actualValues(col)).toEqual([
      { value: 'syriaca', label: 'Syriaca' },
      { value: 'internal', label: 'Internal' },
    ]);
    expect((fi(col).options as Record<string, unknown>)['storeValue']).toBe(true);
    expect(col.displayKey).toBe('label');
  });

  it('fills missing labels on object entries from the registry', () => {
    const col = originCol([{ value: 'trismegistus' }, { value: 'wikidata' }]);
    injectEnumValues([col], originRegistry);
    expect(actualValues(col)).toEqual([
      { value: 'trismegistus', label: 'Trismegistus' },
      { value: 'wikidata', label: 'Wikidata' },
    ]);
  });

  it('keeps explicit local labels', () => {
    const col = originCol([
      { value: 'internal', label: 'Ugent internal' },
      'syriaca',
    ]);
    injectEnumValues([col], originRegistry);
    expect(actualValues(col)).toEqual([
      { value: 'internal', label: 'Ugent internal' },
      { value: 'syriaca', label: 'Syriaca' },
    ]);
  });

  it('leaves a fully-labelled local list untouched', () => {
    const values = [
      { value: 'internal', label: 'Internal' },
      { value: 'wikidata', label: 'Wikidata' },
    ];
    const col = originCol(values);
    injectEnumValues([col], originRegistry);
    expect(actualValues(col)).toEqual(values);
  });

  it('warns for values not in the enum and falls back to the raw value', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const col = originCol(['internal', 'wikidataa']);
    injectEnumValues([col], originRegistry);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('"origin"'),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('wikidataa'),
    );
    expect(actualValues(col)).toEqual([
      { value: 'internal', label: 'Internal' },
      { value: 'wikidataa', label: 'wikidataa' },
    ]);
    warnSpy.mockRestore();
  });

  it('leaves local values untouched when the enum name is unknown', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const col = originCol(['internal']);
    col.enum = 'no_such_enum';
    injectEnumValues([col], originRegistry);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('no_such_enum'),
    );
    expect(actualValues(col)).toEqual(['internal']);
    warnSpy.mockRestore();
  });

  it('resolves string entries in the deprecated `options` alias too', () => {
    const col = invalid<JsonColumn>({
      id: 'origin',
      type: 'string',
      enum: 'author_origin_enum',
      fieldInput: invalid<JsonColumn['fieldInput']>({
        type: 'select',
        options: { options: ['wikidata'] },
      }),
    });
    injectEnumValues([col], originRegistry);
    expect((fi(col).options as Record<string, unknown>)['options']).toEqual([
      { value: 'wikidata', label: 'Wikidata' },
    ]);
  });

  it('does not touch non-enum columns with local values', () => {
    const col = invalid<JsonColumn>({
      id: 'origin',
      type: 'string',
      fieldInput: invalid<JsonColumn['fieldInput']>({
        type: 'select',
        options: { values: ['internal', 'wikidata'] },
      }),
    });
    injectEnumValues([col], originRegistry);
    expect(actualValues(col)).toEqual(['internal', 'wikidata']);
    expect((fi(col).options as Record<string, unknown>)['displayValues']).toBeUndefined();
  });

  it('does not set displayValues without a local restriction', () => {
    const col = invalid<JsonColumn>({ id: 'origin', type: 'string', enum: 'author_origin_enum' });
    injectEnumValues([col], originRegistry);
    expect(actualValues(col)).toEqual(originRegistry.author_origin_enum);
    expect((fi(col).options as Record<string, unknown>)['displayValues']).toBeUndefined();
  });
});
