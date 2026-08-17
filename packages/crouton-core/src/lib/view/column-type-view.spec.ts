import { describe, expect, it } from 'vitest';

import { columnToJsonSchemaProperty } from './column-type-schema.source';
import { buildViewsFromColumnTypes } from './view.builder';
import { ResourceJsonSchema } from '../resource/ResourceJson.schema';

/** Parse through the real schema so defaults/labels match production. */
const columnsOf = (columns: Record<string, unknown>) =>
  ResourceJsonSchema.parse({
    name: 'zotero_item',
    route: 'zotero-items',
    tag: 'Zotero',
    kind: 'custom',
    operations: {},
    columns,
  }).columns!;

describe('columnToJsonSchemaProperty', () => {
  it('expands a shorthand and injects the label as title', () => {
    const [col] = columnsOf({ page_count: { type: 'integer' } });
    expect(columnToJsonSchemaProperty(col)).toEqual({
      type: 'integer',
      title: 'Page count',
    });
  });

  it('keeps a nested object fragment intact', () => {
    const [col] = columnsOf({
      type: {
        type: {
          type: 'object',
          properties: { id: { type: 'string' }, name: { type: 'string' } },
        },
      },
    });
    expect(columnToJsonSchemaProperty(col)).toEqual({
      type: 'object',
      properties: { id: { type: 'string' }, name: { type: 'string' } },
      title: 'Type',
    });
  });

  it('carries fieldInput.defaultValue onto default', () => {
    const [col] = columnsOf({
      status: { type: 'string', fieldInput: { defaultValue: 'draft' } },
    });
    expect(columnToJsonSchemaProperty(col).default).toBe('draft');
  });

  it('derives enum from option values, unwrapping {value,label}', () => {
    const [col] = columnsOf({
      status: {
        type: 'string',
        fieldInput: {
          type: 'select',
          options: {
            values: [
              { value: 'draft', label: 'Draft' },
              { value: 'live', label: 'Live' },
            ],
          },
        },
      },
    });
    expect(columnToJsonSchemaProperty(col).enum).toEqual(['draft', 'live']);
  });

  it('emits a typeless property for an untyped autocomplete column', () => {
    const [col] = columnsOf({
      author: { fieldInput: { type: 'autocomplete' } },
    });
    expect(columnToJsonSchemaProperty(col).type).toBeUndefined();
  });

  it('does not overwrite a title declared in the fragment', () => {
    const [col] = columnsOf({
      title: { type: { type: 'string', title: 'Explicit' } },
    });
    expect(columnToJsonSchemaProperty(col).title).toBe('Explicit');
  });
});

describe('buildViewsFromColumnTypes', () => {
  const columns = columnsOf({
    id: { type: 'string', idField: true, hiddenInForm: true },
    title: { type: 'string', searchable: true, sortable: true, filterable: true },
    year: { type: 'integer', filterable: true },
    public: { type: 'boolean' },
    type: {
      displayKey: 'name',
      type: {
        type: 'object',
        properties: { id: { type: 'string' }, name: { type: 'string' } },
      },
    },
    tags: {
      type: { type: 'array', items: { type: 'string' } },
      hiddenInTable: true,
    },
  });

  const views = buildViewsFromColumnTypes(columns)!;

  it('builds table, form, filter and view', () => {
    expect(Object.keys(views).sort()).toEqual([
      'filter',
      'form',
      'table',
      'view',
    ]);
  });

  it('derives table properties from the column types', () => {
    const properties = (views.table.json_schema as any).properties;
    expect(properties.title.type).toBe('string');
    expect(properties.year.type).toBe('integer');
    expect(properties.public.type).toBe('boolean');
    expect(properties.type).toMatchObject({
      type: 'object',
      properties: { name: { type: 'string' } },
    });
  });

  it('respects hiddenInTable / hiddenInForm', () => {
    expect((views.table.json_schema as any).properties.tags).toBeUndefined();
    expect((views.form.json_schema as any).properties.tags).toBeDefined();
  });

  it('excludes the idField from the form, matching the zod-backed path', () => {
    const scopes = ((views.form.ui_schema as any).elements as any[]).map(
      (e) => e.scope,
    );
    expect(scopes).not.toContain('#/properties/id');
    expect((views.form.json_schema as any).properties.id).toBeUndefined();
    // ...but it is still a table column.
    expect((views.table.json_schema as any).properties.id).toBeDefined();
  });

  it('applies the standard schema transforms to nested objects too', () => {
    const type = (views.table.json_schema as any).properties.type;
    expect(type.additionalProperties).toBe(true);
    expect(type.properties.name.minLength).toBe(1);
  });

  it('emits no required array — shape is declared, validation is the repository author job', () => {
    expect((views.form.json_schema as any).required).toBeUndefined();
  });

  it('renders an object column with a displayKey as a RecordCell', () => {
    const element = ((views.table.ui_schema as any).elements as any[]).find(
      (e) => e.scope === '#/properties/type',
    );
    expect(element.type).toBe('RecordCell');
  });

  it('gives an object form control the object format so a renderer matches', () => {
    const element = ((views.form.ui_schema as any).elements as any[]).find(
      (e) => e.scope === '#/properties/type',
    );
    expect(element.options.format).toBe('object');
  });

  it('gives an array form control the array format', () => {
    const element = ((views.form.ui_schema as any).elements as any[]).find(
      (e) => e.scope === '#/properties/tags',
    );
    expect(element.options.format).toBe('array');
  });

  it('patches filter hints from the column types', () => {
    const properties = (views.filter.json_schema as any).properties;
    expect(Object.keys(properties).sort()).toEqual(['title', 'year']);
    expect(properties.year['x-field-type']).toBe('number');
    expect(properties.title.title).toBe('Title');
  });

  it('resolves a default sort', () => {
    expect(views.table.defaultSort).toBe('title');
  });

  it('enables additionalProperties so extra payload keys pass validation', () => {
    expect((views.form.json_schema as any).additionalProperties).toBe(true);
  });

  it('returns undefined without columns', () => {
    expect(buildViewsFromColumnTypes(undefined)).toBeUndefined();
    expect(buildViewsFromColumnTypes([])).toBeUndefined();
  });

  it('excludes relation columns from the json schema', () => {
    const withRelation = buildViewsFromColumnTypes(
      columnsOf({
        id: { type: 'string', idField: true },
        author: {
          fieldInput: {
            format: 'relation',
            relationType: 'manyToOne',
            resource: '../author/resource.json',
          },
        },
      }),
    )!;
    expect(
      (withRelation.table.json_schema as any).properties.author,
    ).toBeUndefined();
  });
});
