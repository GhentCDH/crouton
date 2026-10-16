import { describe, expect, it } from 'vitest';

import { collectLayoutFieldIds } from './walk';
import type { Layout } from '../../resource/layout/Layout.schema';

describe('collectLayoutFieldIds', () => {
  it('collects ids from flat form layout', () => {
    const layout: Layout = { form: { items: ['a', 'b', 'c'] } };
    expect([...collectLayoutFieldIds(layout, 'form')]).toEqual(['a', 'b', 'c']);
  });

  it('collects ids from nested form layout depth-first', () => {
    const layout: Layout = {
      form: { items: ['a', { items: ['b', 'c'] }, 'd'] },
    };
    expect([...collectLayoutFieldIds(layout, 'form')]).toEqual(['a', 'b', 'c', 'd']);
  });

  it('skips component items', () => {
    const layout: Layout = {
      form: { items: ['a', { component: 'MyWidget' }, 'b'] },
    };
    expect([...collectLayoutFieldIds(layout, 'form')]).toEqual(['a', 'b']);
  });

  it('collects ids from view layout', () => {
    const layout: Layout = { view: { items: ['x', 'y'] } };
    expect([...collectLayoutFieldIds(layout, 'view')]).toEqual(['x', 'y']);
  });

  it('collects ids from table layout', () => {
    const layout: Layout = { table: { items: ['col1', 'col2'] } as any };
    expect([...collectLayoutFieldIds(layout, 'table')]).toEqual(['col1', 'col2']);
  });

  it('returns empty set when context layout absent', () => {
    const layout: Layout = { table: { items: ['col1'] } as any };
    expect(collectLayoutFieldIds(layout, 'form').size).toBe(0);
    expect(collectLayoutFieldIds(layout, 'view').size).toBe(0);
  });

  it('collects object-form field items by id', () => {
    const layout: Layout = { form: { items: [{ id: 'name', colspan: 2 }] } };
    expect([...collectLayoutFieldIds(layout, 'form')]).toEqual(['name']);
  });
});
