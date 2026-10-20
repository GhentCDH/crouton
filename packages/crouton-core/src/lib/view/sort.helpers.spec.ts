import type { LayoutNode } from '../layout/schema';
import { resolveDefaultSort } from '../layout/sort.helpers';
import type { JsonColumn } from '../resource/Column';

const col = (id: string, extra: Partial<JsonColumn> = {}): JsonColumn =>
  ({ id, ...extra }) as JsonColumn;

describe('resolveDefaultSort', () => {
  it('uses named field and direction from inner table node in a wrapper layout', () => {
    const tableLayout: LayoutNode = {
      type: 'grid',
      items: [
        {
          type: 'table',
          defaultSort: { field: 'title', sortDir: 'asc' },
          items: [{ id: 'title', sortable: true }],
        },
      ],
    } as unknown as LayoutNode;

    const result = resolveDefaultSort(
      [col('title'), col('author')],
      undefined,
      tableLayout,
    );

    expect(result).toEqual({ id: 'title', dir: 'asc' });
  });

  it('returns desc direction when sortDir is "desc"', () => {
    const tableLayout: LayoutNode = {
      type: 'table',
      defaultSort: { field: 'createdAt', sortDir: 'desc' },
      items: [{ id: 'createdAt', sortable: true }],
    } as unknown as LayoutNode;

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
