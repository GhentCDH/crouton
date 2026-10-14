import { describe, expect, it } from 'vitest';

import { runResourceMigrations } from './index';

import { migration_v1_to_v2 } from './migration-v1-to-v2';

const migrate = (raw: Record<string, unknown>) =>
  runResourceMigrations(raw, 2, [migration_v1_to_v2]).raw;

describe('migration v1 → v2', () => {
  it('flat table: controls → items', () => {
    const result = migrate({
      layout: { table: { controls: ['title', 'author'], actions: [{ id: 'del' }] } },
    });
    expect((result['layout'] as any)['table']).toEqual({
      items: ['title', 'author'],
      rowActions: [{ id: 'del' }],
    });
  });

  it('wrapper table: merges controls into items, moves settings to inner table node', () => {
    const result = migrate({
      layout: {
        table: {
          type: 'grid',
          columns: 12,
          actions: [{ id: 'row-act' }],
          tableActions: [{ id: 'tbl-act' }],
          searchFields: ['title'],
          controls: [{ component: 'CreateByIsbn' }],
          items: [{ type: 'table', controls: ['title', 'author'] }],
        },
      },
    });
    const tbl = (result['layout'] as any)['table'];
    expect(tbl).toEqual({
      type: 'grid',
      columns: 12,
      items: [
        { component: 'CreateByIsbn' },
        {
          type: 'table',
          items: ['title', 'author'],
          rowActions: [{ id: 'row-act' }],
          tableActions: [{ id: 'tbl-act' }],
          searchFields: ['title'],
        },
      ],
    });
  });

  it('form/view: controls merged into items, nested nodes recurse', () => {
    const result = migrate({
      layout: {
        form: {
          type: 'grid',
          controls: [{ id: 'title' }],
          items: [{ type: 'collapse', title: 'More', controls: ['summary'] }],
        },
      },
    });
    expect((result['layout'] as any)['form']).toEqual({
      type: 'grid',
      items: [
        { id: 'title' },
        { type: 'collapse', title: 'More', items: ['summary'] },
      ],
    });
  });

  it('subResources: actions → rowActions', () => {
    const result = migrate({
      subResources: [{ id: 'loans', actions: [{ id: 'ret' }] }],
    });
    expect((result['subResources'] as any)[0]).toEqual({ id: 'loans', rowActions: [{ id: 'ret' }] });
  });

  it('idempotent: re-running gives no change', () => {
    const once = migrate({
      layout: {
        table: { controls: ['title'], actions: [{ id: 'x' }] },
      },
    });
    const twice = runResourceMigrations(once, 2, [migration_v1_to_v2]).raw;
    expect(twice).toEqual(once);
  });
});
