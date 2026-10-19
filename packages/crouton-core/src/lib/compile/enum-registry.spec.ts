import { describe, expect, it, vi } from 'vitest';

import { applyEnumDefaults, injectEnumValues } from './enum-registry';
import type { JsonColumn } from '../resource';

const registry = {
  bookStatus: [
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
  ],
};

const enumCol = (): JsonColumn => ({ id: 'status', type: 'string', enum: 'bookStatus' });

describe('applyEnumDefaults', () => {
  it('sets fieldInput.type = select when absent', () => {
    const col = enumCol();
    applyEnumDefaults(col);
    expect(col.fieldInput!.type).toBe('select');
  });

  it('sets fieldInput.type = select when fieldInput exists without type', () => {
    const col: JsonColumn = { ...enumCol(), fieldInput: { position: 0 } as any };
    applyEnumDefaults(col);
    expect(col.fieldInput!.type).toBe('select');
  });

  it('respects existing fieldInput.type', () => {
    const col: JsonColumn = { ...enumCol(), fieldInput: { type: 'multiSelect' } as any };
    applyEnumDefaults(col);
    expect(col.fieldInput!.type).toBe('multiSelect');
  });

  it('defaults emitObject: true', () => {
    const col = enumCol();
    applyEnumDefaults(col);
    expect((col.fieldInput!.options as any).emitObject).toBe(true);
  });

  it('defaults labelKey: label', () => {
    const col = enumCol();
    applyEnumDefaults(col);
    expect((col.fieldInput!.options as any).labelKey).toBe('label');
  });

  it('defaults valueKey: value', () => {
    const col = enumCol();
    applyEnumDefaults(col);
    expect((col.fieldInput!.options as any).valueKey).toBe('value');
  });

  it('sets col.displayKey = label when emitObject is true', () => {
    const col = enumCol();
    applyEnumDefaults(col);
    expect(col.displayKey).toBe('label');
  });

  it('does not set col.displayKey when emitObject: false', () => {
    const col: JsonColumn = {
      ...enumCol(),
      fieldInput: { type: 'select', options: { emitObject: false } as any },
    };
    applyEnumDefaults(col);
    expect(col.displayKey).toBeUndefined();
  });

  it('respects explicit emitObject: false', () => {
    const col: JsonColumn = {
      ...enumCol(),
      fieldInput: { type: 'select', options: { emitObject: false } as any },
    };
    applyEnumDefaults(col);
    expect((col.fieldInput!.options as any).emitObject).toBe(false);
  });

  it('respects existing col.displayKey', () => {
    const col: JsonColumn = { ...enumCol(), displayKey: 'value' };
    applyEnumDefaults(col);
    expect(col.displayKey).toBe('value');
  });

  it('injects values when provided', () => {
    const col = enumCol();
    applyEnumDefaults(col, registry.bookStatus);
    expect((col.fieldInput!.options as any).values).toEqual(registry.bookStatus);
  });

  it('does not set values when not provided (unknown enum)', () => {
    const col = enumCol();
    applyEnumDefaults(col, undefined);
    expect((col.fieldInput!.options as any).values).toBeUndefined();
  });

  it('respects explicit options.values override', () => {
    const custom = [{ value: 'x', label: 'X' }];
    const col: JsonColumn = {
      ...enumCol(),
      fieldInput: { type: 'select', options: { values: custom } as any },
    };
    applyEnumDefaults(col, registry.bookStatus);
    expect((col.fieldInput!.options as any).values).toEqual(custom);
  });
});

describe('injectEnumValues', () => {
  it('applies defaults for all enum columns', () => {
    const col = enumCol();
    injectEnumValues([col], registry);
    expect(col.fieldInput!.type).toBe('select');
    expect((col.fieldInput!.options as any).emitObject).toBe(true);
    expect((col.fieldInput!.options as any).labelKey).toBe('label');
    expect((col.fieldInput!.options as any).values).toEqual(registry.bookStatus);
    expect(col.displayKey).toBe('label');
  });

  it('warns and applies defaults (without values) for unknown enum', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const col: JsonColumn = { id: 'foo', type: 'string', enum: 'unknownEnum' };
    injectEnumValues([col], registry);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknownEnum'));
    expect(col.fieldInput!.type).toBe('select');
    expect((col.fieldInput!.options as any).values).toBeUndefined();
    warnSpy.mockRestore();
  });

  it('skips columns with no enum ref', () => {
    const col: JsonColumn = { id: 'name', type: 'string' };
    injectEnumValues([col], registry);
    expect(col.fieldInput).toBeUndefined();
  });

  it('handles undefined columns gracefully', () => {
    expect(() => injectEnumValues(undefined, registry)).not.toThrow();
  });
});
