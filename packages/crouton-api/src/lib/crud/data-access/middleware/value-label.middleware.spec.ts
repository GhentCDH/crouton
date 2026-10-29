import { describe, expect, it } from 'vitest';

import type { JsonColumn } from '@ghentcdh/crouton-core';

import type { HookTarget } from './hooks';
import { decorateRows, prepareWrite } from './hooks';
import { valueLabelColumnsOf } from './hooks/hooks.apply';
import { applyValueLabelColumns } from './value-label.apply';

const adapter = { kind: 'prisma', client: {} } as never;

const baseTarget = (
  cols: Partial<JsonColumn>[],
): HookTarget => ({
  columns: cols as JsonColumn[],
});

const values = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
];

describe('value-label middleware — derived from columns', () => {
  it('valueLabelColumnsOf derives (memoized) from HookTarget.columns', () => {
    const target = baseTarget([
      { id: 'status', fieldInput: { type: 'select', options: { emitObject: true, values } } },
    ]);
    const cols = valueLabelColumnsOf(target);
    expect(cols).toEqual([{ field: 'status', values }]);
    expect(valueLabelColumnsOf(target)).toBe(cols); // memoized
  });

  it('decorateRows wraps configured fields in a {value,label} envelope', async () => {
    const rows = await decorateRows(
      [{ id: 1, status: 'draft' }],
      'findAll',
      baseTarget([
        { id: 'status', fieldInput: { type: 'select', options: { emitObject: true, values } } },
      ]),
      adapter,
    );
    expect(rows).toEqual([
      { id: 1, status: { value: 'draft', label: 'Draft' } },
    ]);
  });

  it('decorateRows leaves rows untouched when no column needs the envelope', async () => {
    const row = { id: 1, status: 'draft' };
    const rows = await decorateRows([row], 'findAll', baseTarget([]), adapter);
    expect(rows[0]).toEqual(row);
  });

  it('prepareWrite unwraps the {value,label} envelope before persistence', async () => {
    const data = await prepareWrite(
      { id: 1, status: { value: 'draft', label: 'Draft' } },
      'create',
      baseTarget([
        { id: 'status', fieldInput: { type: 'select', options: { emitObject: true, values } } },
      ]),
      adapter,
    );
    expect(data).toEqual({ id: 1, status: 'draft' });
  });

  it('applyValueLabelColumns works with the sub-resource derivation path', () => {
    // Sub-resources no longer store `valueLabelColumns` on the compiled config;
    // the repositories derive it from `sub.columns`.
    const sub = {
      columns: [
        { id: 'unit', fieldInput: { type: 'select', options: { emitObject: true, values } } },
      ],
    };
    const derived = valueLabelColumnsOf({ columns: sub.columns as JsonColumn[] });
    expect(
      applyValueLabelColumns({ id: 1, unit: 'published' }, derived),
    ).toEqual({ id: 1, unit: { value: 'published', label: 'Published' } });
  });
});
