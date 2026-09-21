import { describe, expect, it } from 'vitest';

import type { JsonColumn } from '@ghentcdh/crouton-core';

import { injectEnumValues } from './enum-registry.injector';
import type { EnumRegistry } from './enum-registry.types';

const registry: EnumRegistry = {
  bookStatus: [
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
  ],
};

const enumCol = (): JsonColumn => ({ id: 'status', type: 'string', enum: 'bookStatus' });

describe('injectEnumValues (api)', () => {
  it('defaults emitObject: true for an enum-ref column', () => {
    const col = enumCol();
    injectEnumValues([col], registry);
    expect((col.fieldInput!.options as any).emitObject).toBe(true);
  });

  it('defaults displayKey: label for an enum-ref column', () => {
    const col = enumCol();
    injectEnumValues([col], registry);
    expect((col.fieldInput!.options as any).displayKey).toBe('label');
  });

  it('respects explicit emitObject: false', () => {
    const col: JsonColumn = {
      ...enumCol(),
      fieldInput: { type: 'select', options: { emitObject: false } },
    };
    injectEnumValues([col], registry);
    expect((col.fieldInput!.options as any).emitObject).toBe(false);
  });

  it('respects explicit displayKey override', () => {
    const col: JsonColumn = {
      ...enumCol(),
      fieldInput: { type: 'select', options: { displayKey: 'value' } },
    };
    injectEnumValues([col], registry);
    expect((col.fieldInput!.options as any).displayKey).toBe('value');
  });

  it('injects values from registry', () => {
    const col = enumCol();
    injectEnumValues([col], registry);
    expect((col.fieldInput!.options as any).values).toEqual(registry.bookStatus);
  });

  it('skips columns with no enum ref', () => {
    const col: JsonColumn = { id: 'name', type: 'string' };
    injectEnumValues([col], registry);
    expect(col.fieldInput).toBeUndefined();
  });

  it('skips unknown enum names', () => {
    const col: JsonColumn = { id: 'foo', type: 'string', enum: 'unknownEnum' };
    injectEnumValues([col], registry);
    expect(col.fieldInput).toBeUndefined();
  });
});
