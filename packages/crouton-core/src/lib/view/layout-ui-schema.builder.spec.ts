import { describe, expect, it, vi } from 'vitest';

import { buildFormUiSchema } from './form-schema.builder';
import { orderTableColumnsFromLayout } from './layout-table-order';
import {
  buildFormUiSchemaFromLayout,
  flattenLayoutControlIds,
} from './layout-ui-schema.builder';
import { buildTableUiSchema } from './table-schema.builder';
import { JsonColumnSchema } from '../resource/Column';
import type { LayoutNode } from '../resource/layout';

const parse = (arr: Record<string, unknown>[]) =>
  arr.map((c) => JsonColumnSchema.parse(c));

const cols = parse([
  { id: 'name', label: 'Name', fieldInput: { type: 'text' } },
  { id: 'bio', fieldInput: { type: 'textarea' } },
  { id: 'status', fieldInput: { type: 'text' } },
]);

const byScope = (uiSchema: any, id: string) =>
  (uiSchema.elements as any[]).find(
    (e: any) => e.scope === `#/properties/${id}`,
  );

// ── Backward-compat snapshot ───────────────────────────────────────────────

describe('backward-compat: no layout = identical to buildFormUiSchema', () => {
  it('produces byte-identical output', () => {
    const baseline = buildFormUiSchema(cols);
    const fromLayout = buildFormUiSchemaFromLayout(
      { type: 'grid', items: ['name', 'bio', 'status'] },
      cols,
    );
    expect(fromLayout).toEqual(baseline);
  });
});

// ── Flat grid ──────────────────────────────────────────────────────────────

describe('buildFormUiSchemaFromLayout – flat grid', () => {
  const node: LayoutNode = {
    type: 'grid',
    columns: 12,
    items: ['name', 'bio'],
  };

  it('builds GridLayout with only the declared items', () => {
    const ui = buildFormUiSchemaFromLayout(node, cols) as any;
    expect(ui.type).toBe('GridLayout');
    expect(ui.elements).toHaveLength(2); // name + bio only; layout is the full list
  });
});

// ── Colspan / rowspan overrides ────────────────────────────────────────────

describe('buildFormUiSchemaFromLayout – control overrides', () => {
  it('applies colspan and rowspan', () => {
    const node: LayoutNode = {
      items: [{ id: 'name', colspan: 6, rowspan: 2 }, 'bio', 'status'],
    };
    const ui = buildFormUiSchemaFromLayout(node, cols) as any;
    const name = byScope(ui, 'name');
    expect(name.options.colspan).toBe(6);
    expect(name.options.rowspan).toBe(2);
  });

  it('applies label override', () => {
    const node: LayoutNode = {
      items: [{ id: 'name', label: 'Full name' }, 'bio', 'status'],
    };
    const ui = buildFormUiSchemaFromLayout(node, cols) as any;
    expect(byScope(ui, 'name').options.label).toBe('Full name');
  });

  it('applies hideLabel override', () => {
    const node: LayoutNode = {
      items: [{ id: 'name', hideLabel: true }, 'bio', 'status'],
    };
    const ui = buildFormUiSchemaFromLayout(node, cols) as any;
    expect(byScope(ui, 'name').options.hideLabel).toBe(true);
  });

  it('preserves format when only options are overridden (no type)', () => {
    const markdownCols = parse([
      { id: 'body', fieldInput: { type: 'markdown' } },
    ]);
    const node: LayoutNode = {
      items: [{ id: 'body', options: { minHeight: '8rem' } }],
    };
    const ui = buildFormUiSchemaFromLayout(node, markdownCols) as any;
    expect(ui.elements[0].options.format).toBe('markdown');
    expect(ui.elements[0].options.minHeight).toBe('8rem');
  });
});

// ── Nested sections ────────────────────────────────────────────────────────

describe('buildFormUiSchemaFromLayout – nested sections', () => {
  it('wraps items in a nested container', () => {
    const node: LayoutNode = {
      type: 'grid',
      items: ['name', { type: 'collapse', title: 'More', items: ['bio', 'status'] }],
    };
    const ui = buildFormUiSchemaFromLayout(node, cols) as any;
    expect(ui.elements).toHaveLength(2); // name + collapse node
    expect(ui.elements[1].type).toBe('CollapseLayout');
    expect(ui.elements[1].elements).toHaveLength(2);
  });

  it('builds GroupLayout for group type', () => {
    const node: LayoutNode = {
      items: [
        {
          type: 'group',
          title: 'Details',
          items: ['name', 'bio', 'status'],
        },
      ],
    };
    const ui = buildFormUiSchemaFromLayout(node, cols) as any;
    expect(ui.elements[0].type).toBe('GroupLayout');
  });

  it('interleaves fields and nested nodes in declared order', () => {
    const node: LayoutNode = {
      type: 'grid',
      items: [
        'name',
        { type: 'collapse', title: 'More', items: ['bio'] },
        'status',
      ],
    };
    const ui = buildFormUiSchemaFromLayout(node, cols) as any;
    expect(ui.elements).toHaveLength(3);
    expect(ui.elements[0].scope).toBe('#/properties/name');
    expect(ui.elements[1].type).toBe('CollapseLayout');
    expect(ui.elements[2].scope).toBe('#/properties/status');
  });
});

// ── Unknown id ────────────────────────────────────────────────────────────

describe('buildFormUiSchemaFromLayout – unknown id', () => {
  it('skips and warns on unknown column id', () => {
    const warn = vi.fn();
    const node: LayoutNode = { items: ['name', 'ghost', 'bio', 'status'] };
    const ui = buildFormUiSchemaFromLayout(node, cols, warn) as any;
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"ghost"'));
    expect(
      ui.elements.find((e: any) => e.scope?.includes('ghost')),
    ).toBeUndefined();
  });
});

// ── flattenLayoutControlIds ────────────────────────────────────────────────

describe('flattenLayoutControlIds', () => {
  it('depth-first flattens items', () => {
    const node: LayoutNode = {
      items: ['name', { items: ['bio'] }, { items: ['status'] }],
    };
    expect(flattenLayoutControlIds(node)).toEqual(['name', 'bio', 'status']);
  });
});

// ── orderTableColumnsFromLayout ────────────────────────────────────────────

describe('orderTableColumnsFromLayout', () => {
  const tableCols = parse([
    { id: 'name', label: 'Name', fieldInput: { type: 'text' } },
    { id: 'bio', fieldInput: { type: 'text' } },
    { id: 'status', fieldInput: { type: 'text' } },
  ]);

  it('reorders elements by layout declaration', () => {
    const view = {
      json_schema: {},
      ui_schema: buildTableUiSchema(tableCols),
      columns: tableCols,
    };
    const node: LayoutNode = { items: ['status', 'name', 'bio'] };
    const ordered = orderTableColumnsFromLayout(view as any, node);
    const elements = (ordered.ui_schema as any).elements;
    expect(elements[0].scope).toContain('status');
    expect(elements[1].scope).toContain('name');
    expect(elements[2].scope).toContain('bio');
  });

  it('shows only referenced columns — layout is the full list', () => {
    const view = {
      json_schema: {},
      ui_schema: buildTableUiSchema(tableCols),
      columns: tableCols,
    };
    const node: LayoutNode = { items: ['status'] };
    const ordered = orderTableColumnsFromLayout(view as any, node);
    const ids = (ordered.ui_schema as any).elements.map((e: any) =>
      e.scope.replace('#/properties/', ''),
    );
    expect(ids).toEqual(['status']);
  });
});
