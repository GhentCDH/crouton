import { describe, expect, it } from 'vitest';

import { compileResource } from './compile-resource';
import type { ResourceJson } from '../resource';
import { invalid } from '../utils/test-utils';

type CalcCol = { id: string; type: string };
type WithCalcCols = { calculatedColumns?: CalcCol[] };

const baseJson = invalid<ResourceJson>({
  name: 'article',
  route: 'articles',
  model: 'Article',
  tag: 'Articles',
  operations: { findAll: true, findOne: true, create: true, update: true, patch: true, delete: true },
  columns: [
    { id: 'id', type: 'string', idField: true, hiddenInForm: true },
    { id: 'title', type: 'string' },
    { id: 'body', type: 'string', fieldInput: { type: 'markdown' } },
    { id: 'status', type: 'string' },
    { id: 'createdAt', type: 'string', hiddenInForm: true },
  ],
});

describe('compileResource — layout wired', () => {
  it('no layout → form ui_schema defaults to GridLayout', () => {
    const result = compileResource(baseJson);
    expect(result.views['form']?.ui_schema?.['type']).toBe('GridLayout');
  });

  it('layout.form collapse → CollapseLayout appears in ui_schema', () => {
    const json = invalid<ResourceJson>({
      ...baseJson,
      layout: {
        form: {
          items: ['title', 'body', { type: 'collapse', title: 'Meta', items: ['status', 'createdAt'] }],
        },
      },
    });
    const ui = compileResource(json).views['form']?.ui_schema as Record<string, unknown>;
    const elements = ui?.['elements'] as Record<string, unknown>[] | undefined;
    expect(elements?.some((e) => e['type'] === 'CollapseLayout')).toBe(true);
  });

  it('layout.table reorders table ui_schema elements', () => {
    const json = invalid<ResourceJson>({
      ...baseJson,
      layout: { table: { items: ['status', 'title'] } },
    });
    const elements = (compileResource(json).views['table']?.ui_schema?.['elements'] as Record<string, unknown>[]) ?? [];
    expect((elements[0]['scope'] as string)).toContain('status');
    expect((elements[1]['scope'] as string)).toContain('title');
  });

  it('empty layout → same form ui_schema as no layout (regression guard)', () => {
    const noLayout = compileResource(baseJson);
    const emptyLayout = compileResource(invalid<ResourceJson>({ ...baseJson, layout: {} }));
    expect(noLayout.views['form']?.ui_schema).toEqual(emptyLayout.views['form']?.ui_schema);
  });
});

describe('compileResource — search fallback excludes computed columns (#246)', () => {
  const jsonWithComputed = invalid<ResourceJson>({
    ...baseJson,
    columns: [
      ...(baseJson.columns ?? []),
      { id: 'display_label', type: 'string', computed: { sql: 'first || \' \' || last', type: 'string' } },
    ],
  });

  it('search fallback does not include computed column ids', () => {
    const result = compileResource(jsonWithComputed);
    expect(result.search).not.toContain('display_label');
  });

  it('regular columns are still included in search fallback', () => {
    const result = compileResource(jsonWithComputed);
    expect(result.search).toContain('title');
  });
});

describe('compileResource — computed column type default (#248)', () => {
  it('computed column with no explicit type defaults to "string", not "number"', () => {
    const json = invalid<ResourceJson>({
      ...baseJson,
      columns: [
        ...(baseJson.columns ?? []),
        { id: 'label_col', type: 'string', computed: { sql: 'first || \' \' || last' } },
      ],
    });
    const result = compileResource(json);
    const calculatedCols = invalid<WithCalcCols>(result).calculatedColumns;
    const col = calculatedCols?.find((c) => c.id === 'label_col');
    expect(col?.type).toBe('string');
  });
});

describe('compileResource — computed columns not duplicated in table (#247)', () => {
  const jsonWithComputed = invalid<ResourceJson>({
    ...baseJson,
    columns: [
      ...(baseJson.columns ?? []),
      { id: 'display_label', type: 'string', computed: { sql: 'first || \' \' || last', type: 'string' } },
    ],
  });

  it('computed column appears exactly once in table ui_schema elements', () => {
    const result = compileResource(jsonWithComputed);
    const elements = (result.views['table']?.ui_schema?.['elements'] as Record<string, unknown>[]) ?? [];
    const ids = elements.map((e) => (e['scope'] as string | undefined)?.split('/').pop());
    expect(ids.filter((id) => id === 'display_label')).toHaveLength(1);
  });
});

describe('compileResource — source flattening (dbTable/datasource, not the removed table/database)', () => {
  it('flattens source.dbTable → table and source.datasource → database', () => {
    const json = invalid<ResourceJson>({
      ...baseJson,
      source: {
        model: 'Article',
        dbTable: 'articles_staging',
        datasource: 'archivedb',
        idType: 'number',
      },
    });
    const result = compileResource(json);
    expect(result.model).toBe('Article');
    expect(result.table).toBe('articles_staging');
    expect(result.database).toBe('archivedb');
    expect(result.idType).toBe('number');
  });

  it('does not read the removed source.table / source.database keys', () => {
    const json = invalid<ResourceJson>({
      ...baseJson,
      source: {
        model: 'Article',
        table: 'legacy_table',
        database: 'legacy_db',
      },
    });
    const result = compileResource(json);
    expect(result.table).toBeUndefined();
    expect(result.database).toBeUndefined();
    expect(result.model).toBe('Article');
  });
});

describe('compileResource — input-only keys are not copied to the compiled resource', () => {
  it('does not expose the raw operation toggles', () => {
    const result = compileResource(baseJson);
    expect('operations' in result).toBe(false);
  });

  it('does not expose the openapi block but flattens its tag', () => {
    const json = invalid<ResourceJson>({
      ...baseJson,
      openapi: { tag: 'Articles API' },
    });
    const result = compileResource(json);
    expect('openapi' in result).toBe(false);
    expect(result.tag).toBe('Articles API');
  });
});
