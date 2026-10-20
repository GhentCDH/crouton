import { describe, expect, it } from 'vitest';

import { collectLayoutFieldIds, resolveColumnVisibility } from '../layout/layout-visibility';
import type { Layout } from '../layout/schema/Layout.schema';
import type { JsonColumn } from '../resource/Column';

const col = (
  id: string,
  overrides: Partial<JsonColumn> = {},
): JsonColumn => ({
  id,
  type: 'string',
  label: id,
  ...overrides,
} as JsonColumn);

describe('collectLayoutFieldIds', () => {
  it('collects ids from flat form layout', () => {
    const layout: Layout = { form: { items: ['title', 'status'] } };
    expect(collectLayoutFieldIds(layout, 'form')).toEqual(new Set(['title', 'status']));
  });

  it('collects ids from nested form layout', () => {
    const layout: Layout = {
      form: {
        items: [
          'title',
          { type: 'collapse', title: 'More', items: ['status', 'extra'] },
        ],
      },
    };
    expect(collectLayoutFieldIds(layout, 'form')).toEqual(
      new Set(['title', 'status', 'extra']),
    );
  });

  it('collects ids from flat table layout', () => {
    const layout: Layout = { table: { items: ['title', { id: 'status', sortable: true }] } };
    expect(collectLayoutFieldIds(layout, 'table')).toEqual(new Set(['title', 'status']));
  });

  it('collects ids from wrapper table layout', () => {
    const layout: Layout = {
      table: {
        type: 'grid' as any,
        items: [
          { component: 'Header' } as any,
          { type: 'table', items: ['title', 'year'] } as any,
        ],
      } as any,
    };
    expect(collectLayoutFieldIds(layout, 'table')).toEqual(new Set(['title', 'year']));
  });

  it('returns empty set when context has no layout', () => {
    const layout: Layout = { form: { items: ['title'] } };
    expect(collectLayoutFieldIds(layout, 'table')).toEqual(new Set());
    expect(collectLayoutFieldIds(layout, 'view')).toEqual(new Set());
  });

  it('skips component items', () => {
    const layout: Layout = {
      form: { items: [{ component: 'Banner' } as any, 'title'] },
    };
    expect(collectLayoutFieldIds(layout, 'form')).toEqual(new Set(['title']));
  });
});

describe('resolveColumnVisibility', () => {
  const columns = [
    col('id', { hiddenInForm: true, hiddenInView: true }),
    col('title'),
    col('status', { hiddenInTable: true }),
    col('notes', { hiddenInForm: true }),
  ];

  it('returns columns unchanged when no layout', () => {
    const result = resolveColumnVisibility(columns, undefined);
    expect(result).toBe(columns);
  });

  it('returns columns unchanged when layout has no contexts', () => {
    const result = resolveColumnVisibility(columns, {});
    expect(result).toBe(columns);
  });

  it('layout.form overrides hiddenInForm for all columns', () => {
    const layout: Layout = { form: { items: ['title', 'notes'] } };
    const result = resolveColumnVisibility(columns, layout);

    expect(result.find((c) => c.id === 'title')?.hiddenInForm).toBe(false);
    expect(result.find((c) => c.id === 'notes')?.hiddenInForm).toBe(false);
    expect(result.find((c) => c.id === 'id')?.hiddenInForm).toBe(true);
    expect(result.find((c) => c.id === 'status')?.hiddenInForm).toBe(true);
  });

  it('layout.form does not affect hiddenInTable or hiddenInView', () => {
    const layout: Layout = { form: { items: ['title'] } };
    const result = resolveColumnVisibility(columns, layout);

    // hiddenInTable not touched by form layout
    expect(result.find((c) => c.id === 'status')?.hiddenInTable).toBe(true);
    // hiddenInView not touched by form layout
    expect(result.find((c) => c.id === 'id')?.hiddenInView).toBe(true);
  });

  it('layout.table overrides hiddenInTable for all columns', () => {
    const layout: Layout = { table: { items: ['title', 'status'] } };
    const result = resolveColumnVisibility(columns, layout);

    expect(result.find((c) => c.id === 'title')?.hiddenInTable).toBe(false);
    expect(result.find((c) => c.id === 'status')?.hiddenInTable).toBe(false);
    expect(result.find((c) => c.id === 'id')?.hiddenInTable).toBe(true);
    expect(result.find((c) => c.id === 'notes')?.hiddenInTable).toBe(true);
  });

  it('multiple contexts override independently', () => {
    const layout: Layout = {
      form: { items: ['title', 'notes'] },
      table: { items: ['title', 'status'] },
    };
    const result = resolveColumnVisibility(columns, layout);

    const title = result.find((c) => c.id === 'title')!;
    expect(title.hiddenInForm).toBe(false);
    expect(title.hiddenInTable).toBe(false);

    const status = result.find((c) => c.id === 'status')!;
    expect(status.hiddenInForm).toBe(true); // not in form layout
    expect(status.hiddenInTable).toBe(false); // in table layout
  });

  it('listed-but-hidden column becomes visible (P2 rule)', () => {
    const layout: Layout = { table: { items: ['status'] } }; // status has hiddenInTable:true
    const result = resolveColumnVisibility(columns, layout);
    expect(result.find((c) => c.id === 'status')?.hiddenInTable).toBe(false);
  });

  it('layout.table with no items falls back to hiddenInTable flags', () => {
    const layout: Layout = { table: { filterFields: ['status'] } };
    const result = resolveColumnVisibility(columns, layout);
    // No items → treat as if no table layout for visibility; column flags preserved
    expect(result.find((c) => c.id === 'status')?.hiddenInTable).toBe(true);
    expect(result.find((c) => c.id === 'title')?.hiddenInTable).toBeFalsy();
  });

  it('wrapper table layout controls visibility', () => {
    const layout: Layout = {
      table: {
        type: 'grid' as any,
        items: [
          { component: 'Header' } as any,
          { type: 'table', items: ['title'] } as any,
        ],
      } as any,
    };
    const result = resolveColumnVisibility(columns, layout);
    expect(result.find((c) => c.id === 'title')?.hiddenInTable).toBe(false);
    expect(result.find((c) => c.id === 'status')?.hiddenInTable).toBe(true);
  });
});
