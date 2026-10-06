import { describe, expect, it } from 'vitest';

import { compileResource } from './compile-resource';
import type { ResourceJson } from '../resource';

const baseJson = {
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
          controls: ['title', 'body'],
          items: [{ type: 'collapse', title: 'Meta', controls: ['status', 'createdAt'] }],
        },
      },
    } as unknown as ResourceJson;
    const ui = (compileResource(json).views as any)?.form?.ui_schema as any;
    expect(ui.elements.some((e: any) => e.type === 'CollapseLayout')).toBe(true);
  });

  it('layout.table reorders table ui_schema elements', () => {
    const json = {
      ...baseJson,
      layout: { table: { controls: ['status', 'title'] } },
    } as unknown as ResourceJson;
    const elements = ((compileResource(json).views as any)?.table?.ui_schema as any)?.elements;
    expect(elements[0].scope).toContain('status');
    expect(elements[1].scope).toContain('title');
  });

  it('empty layout → same form ui_schema as no layout (regression guard)', () => {
    const noLayout = compileResource(baseJson);
    const emptyLayout = compileResource({ ...baseJson, layout: {} } as unknown as ResourceJson);
    expect((noLayout.views as any)?.form?.ui_schema).toEqual(
      (emptyLayout.views as any)?.form?.ui_schema,
    );
  });
});
