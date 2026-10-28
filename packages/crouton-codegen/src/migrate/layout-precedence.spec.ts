import { describe, expect, it } from 'vitest';

import { migrateLayoutPrecedence } from './layout-precedence';

type LayoutNode = { items?: LayoutItem[] };
type LayoutItem = string | { type?: string; title?: string; items?: LayoutItem[]; component?: string };
type TestLayout = { form?: LayoutNode; table?: LayoutNode };
const layout = (r: { resource: Record<string, unknown> }) => r.resource['layout'] as TestLayout;

const base = {
  name: 'item',
  route: 'items',
  columns: {
    id: { type: 'string', idField: true, hiddenInForm: true },
    title: { type: 'string' },
    status: { type: 'string' },
    notes: { type: 'string', hiddenInTable: true },
  },
};

describe('migrateLayoutPrecedence', () => {
  it('returns unchanged resource when no layout', () => {
    const { resource, report } = migrateLayoutPrecedence(base);
    expect(resource).toBe(base);
    expect(report.appended).toEqual({ form: [], view: [], table: [] });
    expect(report.removed).toEqual({ form: [], view: [], table: [] });
  });

  it('returns unchanged resource when layout has no defined contexts', () => {
    const r = { ...base, layout: {} };
    const { resource } = migrateLayoutPrecedence(r);
    expect(resource).toStrictEqual(r);
  });

  describe('form context', () => {
    it('appends visible-by-flag columns not in layout', () => {
      const r = { ...base, layout: { form: { items: ['title'] } } };
      const { resource, report } = migrateLayoutPrecedence(r);

      const items = layout({ resource }).form!.items;
      // id is hiddenInForm so not appended; status and notes are visible → appended
      expect(items).toContain('title');
      expect(items).toContain('status');
      expect(items).toContain('notes');
      expect(items).not.toContain('id');
      expect(report.appended.form).toEqual(expect.arrayContaining(['status', 'notes']));
    });

    it('removes hidden-by-flag columns listed in layout', () => {
      const r = {
        ...base,
        layout: { form: { items: ['id', 'title'] } }, // id has hiddenInForm:true
      };
      const { resource, report } = migrateLayoutPrecedence(r);

      const items = layout({ resource }).form!.items;
      expect(items).not.toContain('id');
      expect(report.removed.form).toContain('id');
    });

    it('removes from nested collapse node', () => {
      const r = {
        ...base,
        layout: {
          form: {
            items: [
              'title',
              { type: 'collapse', title: 'More', items: ['id', 'status'] },
            ],
          },
        },
      };
      const { resource, report } = migrateLayoutPrecedence(r);

      const collapse = layout({ resource }).form!.items![1] as { items?: LayoutItem[] };
      expect(collapse.items).not.toContain('id');
      expect(collapse.items).toContain('status');
      expect(report.removed.form).toContain('id');
    });
  });

  describe('table context', () => {
    it('appends visible columns not in flat table layout', () => {
      const r = { ...base, layout: { table: { items: ['title'] } } };
      const { resource, report } = migrateLayoutPrecedence(r);

      const items = layout({ resource }).table!.items;
      expect(items).toContain('title');
      expect(items).toContain('id');
      expect(items).toContain('status');
      expect(items).not.toContain('notes'); // notes has hiddenInTable:true
      expect(report.appended.table).toEqual(expect.arrayContaining(['id', 'status']));
    });

    it('removes hidden-by-flag column from flat table layout', () => {
      const r = {
        ...base,
        layout: { table: { items: ['title', 'notes'] } }, // notes has hiddenInTable:true
      };
      const { resource, report } = migrateLayoutPrecedence(r);

      const items = layout({ resource }).table!.items;
      expect(items).not.toContain('notes');
      expect(report.removed.table).toContain('notes');
    });

    it('appends to nested table node inside wrapper', () => {
      const r = {
        ...base,
        layout: {
          table: {
            type: 'grid',
            items: [
              { component: 'Header' },
              { type: 'table', items: ['title'] },
            ],
          },
        },
      };
      const { resource, report } = migrateLayoutPrecedence(r);

      const tableNode = layout({ resource }).table!.items![1] as { items?: LayoutItem[] };
      expect(tableNode.items).toContain('title');
      expect(tableNode.items).toContain('id');
      expect(tableNode.items).toContain('status');
      expect(tableNode.items).not.toContain('notes');
      expect(report.appended.table).toEqual(expect.arrayContaining(['id', 'status']));
    });

    it('removes from nested table node inside wrapper', () => {
      const r = {
        ...base,
        layout: {
          table: {
            type: 'grid',
            items: [
              { component: 'Header' },
              { type: 'table', items: ['title', 'notes'] },
            ],
          },
        },
      };
      const { resource, report } = migrateLayoutPrecedence(r);

      const tableNode = layout({ resource }).table!.items![1] as { items?: LayoutItem[] };
      expect(tableNode.items).not.toContain('notes');
      expect(report.removed.table).toContain('notes');
    });
  });

  it('is idempotent', () => {
    const r = { ...base, layout: { form: { items: ['title'] } } };
    const { resource: once } = migrateLayoutPrecedence(r);
    const { resource: twice, report } = migrateLayoutPrecedence(once);
    expect(twice).toStrictEqual(once);
    expect(report.appended).toEqual({ form: [], view: [], table: [] });
    expect(report.removed).toEqual({ form: [], view: [], table: [] });
  });
});
