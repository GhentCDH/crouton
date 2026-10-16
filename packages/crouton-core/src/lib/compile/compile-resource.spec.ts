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
          items: ['title', 'body', { type: 'collapse', title: 'Meta', items: ['status', 'createdAt'] }],
        },
      },
    } as unknown as ResourceJson;
    const ui = (compileResource(json).views as any)?.form?.ui_schema as any;
    expect(ui.elements.some((e: any) => e.type === 'CollapseLayout')).toBe(true);
  });

  it('layout.table reorders table ui_schema elements', () => {
    const json = {
      ...baseJson,
      layout: { table: { items: ['status', 'title'] } },
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

describe('compileResource — view fallback when layout.view absent', () => {
  const resource = {
    name: 'test',
    route: 'test',
    operations: { findAll: true, findOne: true, create: true, update: true, delete: true },
    columns: [
      { id: 'id', type: 'string', idField: true, hiddenInForm: true, hiddenInView: true },
      { id: 'name', type: 'string', hiddenInForm: false, hiddenInView: false },
      { id: 'internal', type: 'string', hiddenInForm: true, hiddenInView: true },
    ],
  } as unknown as ResourceJson;

  it('no layout → view built from hiddenInView flags', () => {
    const result = compileResource(resource);
    expect((result.views as any)?.view?.columns.map((c: any) => c.id)).toEqual(['name']);
  });

  it('empty layout → view built from hiddenInView flags', () => {
    const result = compileResource({ ...resource, layout: {} } as unknown as ResourceJson);
    expect((result.views as any)?.view?.columns.map((c: any) => c.id)).toEqual(['name']);
  });

  it('form-only layout → view built from hiddenInView flags (form must not affect view)', () => {
    const result = compileResource({
      ...resource,
      layout: { form: { type: 'VerticalLayout', items: ['name'] } },
    } as unknown as ResourceJson);
    expect((result.views as any)?.view?.columns.map((c: any) => c.id)).toEqual(['name']);
  });

  it('form + view layout → view built from layout.view items only', () => {
    const result = compileResource({
      ...resource,
      layout: {
        form: { type: 'VerticalLayout', items: ['name'] },
        view: { type: 'VerticalLayout', items: ['name'] },
      },
    } as unknown as ResourceJson);
    expect((result.views as any)?.view?.columns.map((c: any) => c.id)).toEqual(['name']);
  });

  it('layout.form present, columns lack hiddenInView → view still built', () => {
    const sparse = {
      name: 'test',
      route: 'test',
      operations: { findAll: true, findOne: true, create: true, update: true, delete: true },
      columns: [
        { id: 'id', type: 'string', idField: true, hiddenInForm: true, hiddenInView: true },
        { id: 'name', type: 'string' },
      ],
      layout: { form: { type: 'VerticalLayout', items: ['name'] } },
    } as unknown as ResourceJson;
    const result = compileResource(sparse);
    expect((result.views as any)?.view?.columns.map((c: any) => c.id)).toEqual(['name']);
  });
});
