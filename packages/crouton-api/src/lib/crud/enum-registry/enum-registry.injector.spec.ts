import { describe, expect, it, vi } from 'vitest';

import { type EnumRegistry, type JsonColumn } from '@ghentcdh/crouton-core';
import { injectEnumValues } from '@ghentcdh/crouton-core';

import { invalid } from '../../../testing/index';


const registry: EnumRegistry = {
  bookStatus: [
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
  ],
};

const enumCol = (): JsonColumn => invalid<JsonColumn>({ id: 'status', type: 'string', enum: 'bookStatus' });

describe('injectEnumValues (api re-export from core)', () => {
  it('defaults emitObject: true for an enum-ref column', () => {
    const col = enumCol();
    injectEnumValues([col], registry);
    expect((col.fieldInput?.options as Record<string, unknown> | undefined)?.['emitObject']).toBe(true);
  });

  it('defaults labelKey: label for an enum-ref column', () => {
    const col = enumCol();
    injectEnumValues([col], registry);
    expect((col.fieldInput?.options as Record<string, unknown> | undefined)?.['labelKey']).toBe('label');
  });

  it('defaults valueKey: value for an enum-ref column', () => {
    const col = enumCol();
    injectEnumValues([col], registry);
    expect((col.fieldInput?.options as Record<string, unknown> | undefined)?.['valueKey']).toBe('value');
  });

  it('respects explicit emitObject: false', () => {
    const col: JsonColumn = {
      ...enumCol(),
      fieldInput: { type: 'select', options: { emitObject: false } },
    };
    injectEnumValues([col], registry);
    expect((col.fieldInput?.options as Record<string, unknown> | undefined)?.['emitObject']).toBe(false);
  });

  it('injects values from registry', () => {
    const col = enumCol();
    injectEnumValues([col], registry);
    expect((col.fieldInput?.options as Record<string, unknown> | undefined)?.['values']).toEqual(registry.bookStatus);
  });

  it('warns and applies defaults for unknown enum names', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const col = invalid<JsonColumn>({ id: 'foo', type: 'string', enum: 'unknownEnum' });
    injectEnumValues([col], registry);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknownEnum'));
    expect(col.fieldInput?.type).toBe('select');
    warnSpy.mockRestore();
  });

  it('skips columns with no enum ref', () => {
    const col = invalid<JsonColumn>({ id: 'name', type: 'string' });
    injectEnumValues([col], registry);
    expect(col.fieldInput).toBeUndefined();
  });
});
