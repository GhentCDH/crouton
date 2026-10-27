import { describe, expect, it } from 'vitest';

import { compileResource } from './compile-resource';
import type { ResourceJson } from '../resource';

const baseJson = {
  name: 'article',
  route: 'articles',
  model: 'Article',
  tag: 'Articles',
  operations: {
    findAll: true,
    findOne: true,
    create: true,
    update: true,
    patch: true,
    delete: true,
  },
  columns: [
    { id: 'id', type: 'string', idField: true, hiddenInForm: true },
    { id: 'title', type: 'string' },
    { id: 'body', type: 'string', fieldInput: { type: 'markdown' } },
    { id: 'status', type: 'string' },
    { id: 'createdAt', type: 'string', hiddenInForm: true },
  ],
} as unknown as ResourceJson;

describe('compileResource — layout wired', () => {
  it('no layout → form ui_schema defaults to GridLayout', () => {
    const result = compileResource(baseJson);
    expect((result.views as any)?.form?.ui_schema?.type).toBe('GridLayout');
  });

  it('layout.form collapse → CollapseLayout appears in ui_schema', () => {
    const json = {
      ...baseJson,
      layout: {
        form: {
          items: [
            'title',
            'body',
            { type: 'collapse', title: 'Meta', items: ['status', 'createdAt'] },
          ],
        },
      },
    } as unknown as ResourceJson;
    const ui = (compileResource(json).views as any)?.form?.ui_schema as any;
    expect(ui.elements.some((e: any) => e.type === 'CollapseLayout')).toBe(
      true,
    );
  });

  it('layout.table reorders table ui_schema elements', () => {
    const json = {
      ...baseJson,
      layout: { table: { items: ['status', 'title'] } },
    } as unknown as ResourceJson;
    const elements = (
      (compileResource(json).views as any)?.table?.ui_schema as any
    )?.elements;
    expect(elements[0].scope).toContain('status');
    expect(elements[1].scope).toContain('title');
  });

  it('empty layout → same form ui_schema as no layout (regression guard)', () => {
    const noLayout = compileResource(baseJson);
    const emptyLayout = compileResource({
      ...baseJson,
      layout: {},
    } as unknown as ResourceJson);
    expect((noLayout.views as any)?.form?.ui_schema).toEqual(
      (emptyLayout.views as any)?.form?.ui_schema,
    );
  });
});

describe('compileResource — search fallback excludes computed columns (#246)', () => {
  const jsonWithComputed = {
    ...baseJson,
    columns: [
      ...baseJson.columns,
      {
        id: 'display_label',
        type: 'string',
        computed: { sql: 'first || \' \' || last', type: 'string' },
      },
    ],
  } as unknown as ResourceJson;

  it('search fallback does not include computed column ids', () => {
    const result = compileResource(jsonWithComputed);
    const searchPaths = (result as any).search as string[] | undefined;
    expect(searchPaths).not.toContain('display_label');
  });

  it('regular columns are still included in search fallback', () => {
    const result = compileResource(jsonWithComputed);
    const searchPaths = (result as any).search as string[] | undefined;
    expect(searchPaths).toContain('title');
  });
});

describe('compileResource — computed column type default (#248)', () => {
  it('computed column with no explicit type defaults to "string", not "number"', () => {
    const json = {
      ...baseJson,
      columns: [
        ...baseJson.columns,
        {
          id: 'label_col',
          type: 'string',
          computed: { sql: 'first || \' \' || last' },
        },
      ],
    } as unknown as ResourceJson;
    const result = compileResource(json);
    const calculatedCols = (result as any).calculatedColumns as any[];
    const col = calculatedCols?.find((c) => c.id === 'label_col');
    expect(col?.type).toBe('string');
  });
});

describe('compileResource — computed columns not duplicated in table (#247)', () => {
  const jsonWithComputed = {
    ...baseJson,
    columns: [
      ...baseJson.columns,
      {
        id: 'display_label',
        type: 'string',
        computed: { sql: 'first || \' \' || last', type: 'string' },
      },
    ],
  } as unknown as ResourceJson;

  it('computed column appears exactly once in table ui_schema elements', () => {
    const result = compileResource(jsonWithComputed);
    const elements =
      ((result.views as any)?.table?.ui_schema as any)?.elements ?? [];
    const ids = elements.map((e: any) => e.scope?.split('/').pop());
    expect(ids.filter((id: string) => id === 'display_label')).toHaveLength(1);
  });
});

describe('compileResource — source flattening (dbTable/datasource, not the removed table/database)', () => {
  it('flattens source.dbTable → table and source.datasource → database', () => {
    const json = {
      ...baseJson,
      source: {
        model: 'Article',
        dbTable: 'articles_staging',
        datasource: 'archivedb',
        idType: 'number',
      },
    } as unknown as ResourceJson;
    const result = compileResource(json);
    // expect(result.table).toBe('articles_staging');
    expect(result.database).toBe('archivedb');
    expect(result.idType).toBe('number');
  });

  it('does not read the removed source.table / source.database keys', () => {
    // These keys fail schema validation ("moved to source.dbTable / source.datasource").
    // Even if one slips through, the compiler must not pick them up.
    const json = {
      ...baseJson,
      source: {
        model: 'Article',
        table: 'legacy_table',
        database: 'legacy_db',
      },
    } as unknown as ResourceJson;
    const result = compileResource(json);
    expect(result.table).toBeUndefined();
    expect(result.database).toBeUndefined();
  });
});
