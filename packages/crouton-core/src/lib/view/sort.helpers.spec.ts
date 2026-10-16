import { resolveDefaultSort } from './sort.helpers';
import type { JsonColumn } from '../resource/Column';
import type { LayoutNode } from '../resource/layout';

const col = (id: string, extra: Partial<JsonColumn> = {}): JsonColumn =>
  ({ id, ...extra }) as JsonColumn;

describe('resolveDefaultSort', () => {
  it('reads sortable/defaultSort from inner table node in a wrapper layout', () => {
    const tableLayout: LayoutNode = {
      type: 'grid',
      items: [
        {
          type: 'table',
          items: [{ id: 'title', sortable: true, defaultSort: true }],
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

  it('returns desc direction when defaultSort is "desc"', () => {
    const tableLayout: LayoutNode = {
      type: 'table',
      items: [{ id: 'createdAt', sortable: true, defaultSort: 'desc' }],
    } as unknown as LayoutNode;

    const result = resolveDefaultSort([col('createdAt')], undefined, tableLayout);
    expect(result).toEqual({ id: 'createdAt', dir: 'desc' });
  });

  it('falls through to idField when no sortable column found', () => {
    const result = resolveDefaultSort(
      [col('title')],
      [col('id', { idField: true })],
      undefined,
    );
    expect(result).toEqual({ id: 'id', dir: 'asc' });
  });
});
