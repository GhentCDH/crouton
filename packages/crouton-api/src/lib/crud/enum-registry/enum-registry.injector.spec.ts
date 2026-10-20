import { describe, expect, it, vi } from 'vitest';

import { type EnumRegistry, type JsonColumn } from '@ghentcdh/crouton-core';
import { injectEnumValues } from '@ghentcdh/crouton-core';


const registry: EnumRegistry = {
  bookStatus: [
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
  ],
};

const enumCol = (): JsonColumn => ({ id: 'status', type: 'string', enum: 'bookStatus' } as unknown as JsonColumn);

describe('injectEnumValues (api re-export from core)', () => {
  it('defaults emitObject: true for an enum-ref column', () => {
    const col = enumCol();
    injectEnumValues([col], registry);
    expect((col.fieldInput!.options as any).emitObject).toBe(true);
  });

  it('defaults labelKey: label for an enum-ref column', () => {
    const col = enumCol();
    injectEnumValues([col], registry);
    expect((col.fieldInput!.options as any).labelKey).toBe('label');
  });

  it('defaults valueKey: value for an enum-ref column', () => {
    const col = enumCol();
    injectEnumValues([col], registry);
    expect((col.fieldInput!.options as any).valueKey).toBe('value');
  });

  it('respects explicit emitObject: false', () => {
    const col: JsonColumn = {
      ...enumCol(),
      fieldInput: { type: 'select', options: { emitObject: false } },
    };
    injectEnumValues([col], registry);
    expect((col.fieldInput!.options as any).emitObject).toBe(false);
  });

  it('injects values from registry', () => {
    const col = enumCol();
    injectEnumValues([col], registry);
    expect((col.fieldInput!.options as any).values).toEqual(registry.bookStatus);
  });

  it('warns and applies defaults for unknown enum names', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const col = { id: 'foo', type: 'string', enum: 'unknownEnum' } as unknown as JsonColumn;
    injectEnumValues([col], registry);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknownEnum'));
    expect(col.fieldInput!.type).toBe('select');
    warnSpy.mockRestore();
  });

  it('skips columns with no enum ref', () => {
    const col = { id: 'name', type: 'string' } as unknown as JsonColumn;
    injectEnumValues([col], registry);
    expect(col.fieldInput).toBeUndefined();
  });
});
