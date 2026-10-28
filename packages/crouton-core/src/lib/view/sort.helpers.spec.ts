import { describe, expect, it } from 'vitest';

import type { LayoutNode } from '../layout/schema';
import { resolveDefaultSort } from '../layout/sort.helpers';
import type { JsonColumn } from '../resource/Column';
import { invalid } from '../utils/test-utils';

const col = (id: string, extra: Partial<JsonColumn> = {}): JsonColumn =>
  invalid<JsonColumn>({ id, ...extra });

describe('resolveDefaultSort', () => {
  it('uses named field and direction from inner table node in a wrapper layout', () => {
    const tableLayout: LayoutNode = invalid<LayoutNode>({
      type: 'grid',
      items: [
        {
          type: 'table',
          defaultSort: { field: 'title', sortDir: 'asc' },
          items: [{ id: 'title', sortable: true }],
        },
      ],
    });

    const result = resolveDefaultSort(
      [col('title'), col('author')],
      undefined,
      tableLayout,
    );

    expect(result).toEqual({ id: 'title', dir: 'asc' });
  });

  it('returns desc direction when sortDir is "desc"', () => {
    const tableLayout: LayoutNode = invalid<LayoutNode>({
      type: 'table',
      defaultSort: { field: 'createdAt', sortDir: 'desc' },
      items: [{ id: 'createdAt', sortable: true }],
    });

    const result = resolveDefaultSort([col('createdAt')], undefined, tableLayout);
    expect(result).toEqual({ id: 'createdAt', dir: 'desc' });
  });

  it('falls back to idField when named field not found', () => {
    const result = resolveDefaultSort(
      [col('title')],
      [col('id', { idField: true })],
      undefined,
    );
    expect(result).toEqual({ id: 'id', dir: 'asc' });
  });
});
