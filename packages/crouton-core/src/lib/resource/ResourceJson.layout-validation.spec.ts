import { describe, expect, it, vi } from 'vitest';

import { ResourceJsonSchema } from './ResourceJson.schema';

const base = {
  name: 'item',
  route: 'items',
  kind: 'custom',
  operations: {},
  columns: {
    id: { idField: true, type: 'string' },
    title: { type: 'string' },
    status: { type: 'string' },
  },
};

const issueMessages = (result: { error?: { issues: { message: string }[] } }) =>
  (result.error?.issues ?? []).map((i) => i.message);

describe('layout validation (Phase 3)', () => {
  describe('P5 — unknown column id', () => {
    it('rejects an unknown id in layout.form', () => {
      const result = ResourceJsonSchema.safeParse({
        ...base,
        layout: { form: { items: ['title', 'typo_field'] } },
      });
      expect(result.success).toBe(false);
      expect(issueMessages(result)).toEqual(
        expect.arrayContaining([expect.stringContaining('"typo_field"')]),
      );
    });

    it('rejects an unknown id in layout.view', () => {
      const result = ResourceJsonSchema.safeParse({
        ...base,
        layout: { view: { items: ['ghost'] } },
      });
      expect(result.success).toBe(false);
      expect(issueMessages(result)).toEqual(
        expect.arrayContaining([expect.stringContaining('"ghost"')]),
      );
    });

    it('rejects an unknown id in layout.table items', () => {
      const result = ResourceJsonSchema.safeParse({
        ...base,
        layout: { table: { items: ['title', 'missing'] } },
      });
      expect(result.success).toBe(false);
      expect(issueMessages(result)).toEqual(
        expect.arrayContaining([expect.stringContaining('"missing"')]),
      );
    });

    it('rejects searchFields in layout (moved to operations.findAll.search)', () => {
      const result = ResourceJsonSchema.safeParse({
        ...base,
        layout: { table: { items: ['title'], searchFields: ['title'] } },
      });
      expect(result.success).toBe(false);
      expect(issueMessages(result)).toEqual(
        expect.arrayContaining([expect.stringContaining('searchFields\' was moved')]),
      );
    });

    it('rejects an unknown id in operations.findAll.search', () => {
      const result = ResourceJsonSchema.safeParse({
        ...base,
        operations: { findAll: { search: ['nope'] } },
      });
      expect(result.success).toBe(false);
      expect(issueMessages(result)).toEqual(
        expect.arrayContaining([expect.stringContaining('"nope"')]),
      );
    });

    it('rejects an unknown id in operations.findAll.filter', () => {
      const result = ResourceJsonSchema.safeParse({
        ...base,
        operations: { findAll: { filter: ['nope'] } },
      });
      expect(result.success).toBe(false);
      expect(issueMessages(result)).toEqual(
        expect.arrayContaining([expect.stringContaining('"nope"')]),
      );
    });

    it('accepts a relation path in operations.findAll.filter', () => {
      const result = ResourceJsonSchema.safeParse({
        ...base,
        operations: { findAll: { filter: ['status', 'tags.some.name'] } },
      });
      expect(result.success).toBe(true);
    });

    it('accepts all valid column ids', () => {
      const result = ResourceJsonSchema.safeParse({
        ...base,
        layout: {
          form: { items: ['title', 'status'] },
          view: { items: ['title'] },
          table: { items: ['title', 'status'] },
        },
        operations: { findAll: { filter: ['status'] } },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('duplicate id', () => {
    it('rejects a duplicate id in layout.form', () => {
      const result = ResourceJsonSchema.safeParse({
        ...base,
        layout: { form: { items: ['title', 'title'] } },
      });
      expect(result.success).toBe(false);
      expect(issueMessages(result)).toEqual(
        expect.arrayContaining([expect.stringContaining('Duplicate')]),
      );
    });

    it('rejects a duplicate id in layout.table', () => {
      const result = ResourceJsonSchema.safeParse({
        ...base,
        layout: { table: { items: ['title', 'status', 'title'] } },
      });
      expect(result.success).toBe(false);
      expect(issueMessages(result)).toEqual(
        expect.arrayContaining([expect.stringContaining('Duplicate')]),
      );
    });
  });

  describe('nested form layout', () => {
    it('validates ids in nested collapse nodes', () => {
      const result = ResourceJsonSchema.safeParse({
        ...base,
        layout: {
          form: {
            items: [
              'title',
              { type: 'collapse', title: 'More', items: ['ghost'] },
            ],
          },
        },
      });
      expect(result.success).toBe(false);
      expect(issueMessages(result)).toEqual(
        expect.arrayContaining([expect.stringContaining('"ghost"')]),
      );
    });

    it('accepts valid ids in nested nodes', () => {
      const result = ResourceJsonSchema.safeParse({
        ...base,
        layout: {
          form: {
            items: [
              'title',
              { type: 'collapse', title: 'More', items: ['status'] },
            ],
          },
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('table wrapper layout', () => {
    it('validates ids inside a nested table node', () => {
      const result = ResourceJsonSchema.safeParse({
        ...base,
        layout: {
          table: {
            type: 'grid',
            items: [
              { component: 'Header' },
              { type: 'table', items: ['title', 'ghost'] },
            ],
          },
        },
      });
      expect(result.success).toBe(false);
      expect(issueMessages(result)).toEqual(
        expect.arrayContaining([expect.stringContaining('"ghost"')]),
      );
    });
  });
});

describe('column presentation keys moved to layout items', () => {
  const withColumn = (column: Record<string, unknown>) =>
    ResourceJsonSchema.safeParse({ ...base, columns: { ...base.columns, extra: { type: 'string', ...column } } });

  it.each([
    [{ position: 1 }, '\'position\' moved to the order of layout'],
    [{ hideLabel: true }, '\'hideLabel\' moved to the layout item'],
    [{ fieldInput: { position: 1 } }, '\'fieldInput.position\' moved to the order of layout'],
    [{ fieldInput: { options: { colspan: 6 } } }, '\'fieldInput.options.colspan\' moved to the layout item'],
    [{ fieldInput: { options: { width: 'md' } } }, '\'fieldInput.options.width\' moved to the layout item'],
    [{ fieldInput: { options: { readonly: true } } }, '\'fieldInput.options.readonly\' moved to the layout item'],
    [{ fieldInput: { options: { label: 'x' } } }, '\'fieldInput.options.label\' was removed'],
  ])('strips %j with a migration warning instead of failing', (column, message) => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const result = withColumn(column);
    expect(result.success).toBe(true);
    // same result as if the moved key was never written
    const stripped = JSON.parse(JSON.stringify(column).replace(/"(position|hideLabel|colspan|width|readonly|label)":[^,}]+,?/, '')) as Record<string, unknown>;
    expect(result.data).toEqual(withColumn(stripped).data);
    const warnings = warnSpy.mock.calls.map(([m]) => String(m)).join();
    expect(warnings).toContain(message);
    expect(warnings).toContain('migrate-to-next-alpha.md');
    warnSpy.mockRestore();
  });

  it('accepts the props on layout items', () => {
    const result = ResourceJsonSchema.safeParse({
      ...base,
      layout: { form: { items: [{ id: 'title', colspan: 6, hideLabel: true, readonly: true }] } },
    });
    expect(result.success).toBe(true);
  });
});
