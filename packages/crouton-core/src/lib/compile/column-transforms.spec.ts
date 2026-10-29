import { describe, expect, it } from 'vitest';

import {
  buildValueLabelColumns,
  resolveValueLabelColumns,
} from './column-transforms';
import { compileResource } from './compile-resource';
import type { ResourceJson } from '../resource';
import { invalid } from '../utils/test-utils';

const values = [
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' },
];

describe('buildValueLabelColumns', () => {
  it('derives from fieldInput.options (column, id, enum)', () => {
    const cols = [
      { id: 'color', fieldInput: { type: 'select', options: { emitObject: true, values } } },
      { id: 'plain' },
    ];
    expect(buildValueLabelColumns(cols as never)).toEqual([
      { field: 'color', values },
    ]);
  });

  it('uses the physical column name when overridden', () => {
    const cols = [
      { id: 'color', column: 'col_color', fieldInput: { type: 'select', options: { emitObject: true, values } } },
    ];
    expect(buildValueLabelColumns(cols as never)).toEqual([
      { field: 'col_color', values },
    ]);
  });

  it('skips columns without emitObject or values', () => {
    const cols = [
      { id: 'a', fieldInput: { type: 'select', options: { emitObject: false, values } } },
      { id: 'b', fieldInput: { type: 'select', options: { emitObject: true } } },
      { id: 'c' },
    ];
    expect(buildValueLabelColumns(cols as never)).toEqual([]);
  });
});

describe('resolveValueLabelColumns', () => {
  it('returns undefined for missing/empty columns', () => {
    expect(resolveValueLabelColumns(undefined)).toBeUndefined();
    expect(resolveValueLabelColumns([])).toBeUndefined();
  });

  it('derives and memoizes per column array (WeakMap)', () => {
    const cols = [
      { id: 'color', fieldInput: { type: 'select', options: { emitObject: true, values } } },
    ];
    const first = resolveValueLabelColumns(cols as never);
    const second = resolveValueLabelColumns(cols as never);
    expect(first).toBe(second); // cached — same array identity
    expect(first).toEqual([{ field: 'color', values }]);
  });

  it('returns undefined when no column needs the envelope', () => {
    expect(resolveValueLabelColumns([{ id: 'title' } as never])).toBeUndefined();
  });
});

describe('compileResource — columns carry the value-label enrichment', () => {
  const values = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
  ];
  const json = invalid<ResourceJson>({
    name: 'article',
    route: 'articles',
    model: 'Article',
    tag: 'Articles',
    operations: {},
    columns: [
      { id: 'id', type: 'string', idField: true, hiddenInForm: true },
      { id: 'status', enum: 'status' },
    ],
  });

  it('keeps the enum-injected options.values on the compiled columns (regression: the compile step used to leak only the raw input columns through `...jsonRest`)', () => {
    // Registry injects options.values so the derivation below works — emulate
    // injectEnumValues by passing the same options the registry writes.
    const withValues = invalid<ResourceJson>({
      ...json,
      columns: [
        { id: 'id', type: 'string', idField: true, hiddenInForm: true },
        {
          id: 'status',
          fieldInput: {
            type: 'select',
            options: { emitObject: true, values },
          },
        },
      ],
    });
    const compiled = compileResource(withValues);
    const status = (compiled.columns ?? []).find((c) => c.id === 'status');
    const opts = status?.fieldInput?.options as Record<string, unknown>;
    expect(opts?.['emitObject']).toBe(true);
    expect(opts?.['values']).toEqual(values);
  });

  it('lets the API derive the envelope list from the compiled columns', () => {
    const withValues = invalid<ResourceJson>({
      ...json,
      columns: [
        { id: 'id', type: 'string', idField: true, hiddenInForm: true },
        {
          id: 'status',
          fieldInput: {
            type: 'select',
            options: { emitObject: true, values },
          },
        },
      ],
    });
    const compiled = compileResource(withValues);
    expect(resolveValueLabelColumns(compiled.columns)).toEqual([
      { field: 'status', values },
    ]);
  });

  it('stops emitting the valueLabelColumns projection', () => {
    const withValues = invalid<ResourceJson>({
      ...json,
      columns: [
        { id: 'id', type: 'string', idField: true, hiddenInForm: true },
        {
          id: 'status',
          fieldInput: {
            type: 'select',
            options: { emitObject: true, values },
          },
        },
      ],
    });
    expect('valueLabelColumns' in compileResource(withValues)).toBe(false);
  });
});
