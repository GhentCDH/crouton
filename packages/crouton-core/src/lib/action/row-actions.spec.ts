import { describe, expect, it } from 'vitest';

import { compileResource } from '../compile/compile-resource';
import { resolveTableNode } from '../layout/layout-table-order';
import type { ResourceJson } from '../resource';
import {
  getRowActions,
  getRowProcedureActions,
  getTableActions,
  getTableProcedureActions,
} from './row-actions';
import { invalid } from '../utils/test-utils';

const baseJson = invalid<ResourceJson>({
  name: 'order',
  route: 'orders',
  model: 'Order',
  tag: 'Orders',
  operations: { findAll: true, findOne: true },
  columns: [
    { id: 'id', type: 'string', idField: true, hiddenInForm: true },
    { id: 'number', type: 'string' },
    { id: 'status', type: 'string' },
  ],
});

const rowProcedure = {
  type: 'procedure',
  id: 'publish',
  label: 'Publish',
  procedure: 'publish',
};
const rowLink = {
  type: 'link',
  id: 'doi',
  label: 'DOI',
  href: 'https://doi.org/{id}',
};
const tableProcedure = {
  type: 'procedure',
  id: 'exportAll',
  label: 'Export all',
  procedure: 'exportAll',
};

const withLayout = (table: unknown) =>
  compileResource({
    ...baseJson,
    ...invalid<Partial<ResourceJson>>({ layout: { table } }),
  });

describe('getRowActions / getTableActions', () => {
  it('derives both action kinds from the layout table node', () => {
    const resource = withLayout({
      items: ['number', 'status'],
      rowActions: [rowProcedure, rowLink],
      tableActions: [tableProcedure],
    });

    expect(getRowActions(resource).map((a) => a.id)).toEqual([
      'publish',
      'doi',
    ]);
    expect(getTableActions(resource).map((a) => a.id)).toEqual(['exportAll']);
  });

  it('returns the table actions only from the table node, not row actions', () => {
    const resource = withLayout({
      items: ['number'],
      rowActions: [rowProcedure],
      tableActions: [tableProcedure],
    });
    expect(getTableActions(resource).map((a) => a.id)).not.toContain('publish');
  });

  it('resolves actions declared inside a wrapper layout', () => {
    const resource = withLayout({
      type: 'grid',
      columns: 12,
      items: [{ type: 'table', rowActions: [rowProcedure] }],
    });

    expect(getRowActions(resource).map((a) => a.id)).toEqual(['publish']);
    expect(getTableActions(resource)).toEqual([]);
  });

  it('returns empty arrays when the resource has no layout', () => {
    const resource = compileResource(baseJson);
    expect(getRowActions(resource)).toEqual([]);
    expect(getTableActions(resource)).toEqual([]);
  });

  it('returns empty arrays when the table node declares none', () => {
    const resource = withLayout({ items: ['number'] });
    expect(getRowActions(resource)).toEqual([]);
    expect(getTableActions(resource)).toEqual([]);
  });

  it('returns the same array the layout node holds (the loader resolves in place)', () => {
    const table = {
      items: ['number'],
      rowActions: [rowProcedure],
      tableActions: [tableProcedure],
    };
    const resource = withLayout(table);
    const layoutRowActions: unknown = resolveTableNode(
      resource.layout?.table,
    )?.rowActions;

    expect(getRowActions(resource)).toBe(layoutRowActions);
  });
});

describe('getRowProcedureActions / getTableProcedureActions', () => {
  const table = {
    items: ['number', 'status'],
    rowActions: [rowProcedure, rowLink],
    tableActions: [tableProcedure],
  };
  const resource = withLayout(table);

  it('excludes link actions from the row procedure routes', () => {
    expect(getRowProcedureActions(resource).map((a) => a.id)).toEqual([
      'publish',
    ]);
  });

  it('finds table-level procedures', () => {
    expect(getTableProcedureActions(resource).map((a) => a.id)).toEqual([
      'exportAll',
    ]);
  });

  it('yields empty procedure lists for an action-only layout of links', () => {
    const linksOnly = withLayout({
      items: ['number'],
      rowActions: [rowLink],
      tableActions: [],
    });
    expect(getRowProcedureActions(linksOnly)).toEqual([]);
  });
});
