import { describe, expect, it } from 'vitest';

import type { JsonColumn } from './Column';
import { mergeFieldVariant } from './FieldInput.schema';
import {
  resolveFormField,
  resolveTableField,
  resolveViewField,
} from './fieldVariants';

/** Minimal column factory — only the fields the resolvers read. */
const col = (over: Partial<JsonColumn>): JsonColumn =>
  ({
    id: 'author',
    hiddenInTable: false,
    hiddenInForm: false,
    hiddenInView: false,
    createable: true,
    updateable: true,
    hideLabel: false,
    idField: false,
    showInLookup: false,
    columnType: 'string',
    ...over,
  }) as JsonColumn;

const relationInput = {
  format: 'relation',
  resource: '../author/resource.json',
  options: { colspan: 5, display: 'autocomplete', displayKey: 'name' },
};

describe('mergeFieldVariant', () => {
  it('returns base unchanged when there is no override', () => {
    expect(mergeFieldVariant(relationInput, undefined)).toBe(relationInput);
  });

  it('returns the override when there is no base', () => {
    const v = { options: { display: 'link' } };
    expect(mergeFieldVariant(undefined, v)).toBe(v);
  });

  it('deep-merges options one level, override wins', () => {
    const merged = mergeFieldVariant(relationInput, {
      options: { display: 'link' },
    });
    expect(merged).toEqual({
      format: 'relation',
      resource: '../author/resource.json',
      options: { colspan: 5, display: 'link', displayKey: 'name' },
    });
  });

  it('inherits top-level keys the override omits', () => {
    const merged = mergeFieldVariant(relationInput, {
      options: { displayKey: 'label' },
    });
    expect(merged?.format).toBe('relation');
    expect(merged?.resource).toBe('../author/resource.json');
  });

  it('null in override.options deletes the inherited key', () => {
    const merged = mergeFieldVariant(relationInput, {
      options: { displayKey: null as unknown as string },
    });
    expect(merged?.options).toEqual({ colspan: 5, display: 'autocomplete' });
    expect(
      (merged?.options as Record<string, unknown>).displayKey,
    ).toBeUndefined();
  });

  it('null top-level key in override deletes it', () => {
    const merged = mergeFieldVariant(relationInput, {
      format: null as unknown as string,
    });
    expect(merged?.format).toBeUndefined();
    expect(merged?.resource).toBe('../author/resource.json');
  });
});

describe('resolve*Field fallback chain', () => {
  it('no variant → view and table equal fieldInput', () => {
    const c = col({ fieldInput: relationInput });
    expect(resolveFormField(c)).toBe(relationInput);
    expect(resolveViewField(c)).toEqual(relationInput);
    expect(resolveTableField(c)).toEqual(relationInput);
  });

  it('fieldView only → view and table inherit it, form untouched', () => {
    const c = col({
      fieldInput: relationInput,
      fieldView: { options: { display: 'link' } },
    });
    expect(resolveFormField(c)).toEqual(relationInput);
    const expected = {
      format: 'relation',
      resource: '../author/resource.json',
      options: { colspan: 5, display: 'link', displayKey: 'name' },
    };
    expect(resolveViewField(c)).toEqual(expected);
    expect(resolveTableField(c)).toEqual(expected);
  });

  it('fieldTable removed — table now equals view (resolveViewField)', () => {
    const c = col({ fieldInput: relationInput });
    expect(resolveViewField(c)).toEqual(relationInput);
    // fieldTable is gone; table == view == fieldInput when no fieldView
    expect(resolveTableField(c)).toEqual(relationInput);
  });

  it('fieldView present — table inherits view, no extra table layer', () => {
    const c = col({
      fieldInput: relationInput,
      fieldView: { options: { display: 'link' } },
    });
    const viewResult = resolveViewField(c);
    // table == view now
    expect(resolveTableField(c)).toEqual(viewResult);
    expect(resolveTableField(c)).toEqual({
      format: 'relation',
      resource: '../author/resource.json',
      options: { colspan: 5, display: 'link', displayKey: 'name' },
    });
  });
});
