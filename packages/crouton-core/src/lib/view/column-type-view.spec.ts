import { describe, expect, it } from 'vitest';

import {
  columnToJsonSchemaProperty,
  columnTypeSchemaSource,
} from './column-type-schema.source';
import { buildLayouts } from '../layout';
import type { Layout } from '../layout/schema';
import { ResourceJsonSchema } from '../resource/ResourceJson.schema';
import type { ViewConfig } from '../schema';
import { type TestControl, invalid } from '../utils/test-utils';

const propertiesOf = (
  view: ViewConfig | undefined,
): Record<string, Record<string, unknown>> =>
  (view?.json_schema?.['properties'] ?? {}) as Record<
    string,
    Record<string, unknown>
  >;

const elementsOf = (view: ViewConfig | undefined): TestControl[] =>
  (view?.ui_schema?.['elements'] ?? []) as TestControl[];

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
    title: { type: 'string' },
    year: { type: 'integer' },
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

  const layout = {
    table: {
      filterFields: ['title', 'year'],
      defaultSort: { field: 'title', sortDir: 'asc' },
      // Layout is the full table list — list every column that should appear.
      items: [{ id: 'title', sortable: true }, 'id', 'year', 'public', 'type'],
    },
  };

  const views = buildLayouts(invalid<Layout>(layout), {
    columns,
    source: columnTypeSchemaSource,
    warn: () => undefined,
  });

  it('builds table, form, filter and view', () => {
    expect(Object.keys(views).sort()).toEqual([
      'filter',
      'form',
      'table',
      'view',
    ]);
  });

  it('derives table properties from the column types', () => {
    const properties = propertiesOf(views.table);
    expect(properties.title?.['type']).toBe('string');
    expect(properties.year?.['type']).toBe('integer');
    expect(properties.public?.['type']).toBe('boolean');
    expect(properties.type).toMatchObject({
      type: 'object',
      properties: { name: { type: 'string' } },
    });
  });

  it('unlisted columns are hidden from table; hiddenInTable on columns is the fallback when no layout', () => {
    // tags is not listed in layout.table.items → hidden in table
    expect(propertiesOf(views.table).tags).toBeUndefined();
    // no layout.form → hiddenInForm on the column is used; tags.hiddenInForm defaults to false → visible in form
    expect(propertiesOf(views.form).tags).toBeDefined();
  });

  it('excludes the idField from the form, matching the zod-backed path', () => {
    const scopes = elementsOf(views.form).map((e) => e.scope);
    expect(scopes).not.toContain('#/properties/id');
    expect(propertiesOf(views.form).id).toBeUndefined();
    // id is listed in layout.table.items → in the table schema
    expect(propertiesOf(views.table).id).toBeDefined();
  });

  it('applies the standard schema transforms to nested objects too', () => {
    const type = propertiesOf(views.table).type;
    expect(type?.['additionalProperties']).toBe(true);
    expect(
      (type?.['properties'] as Record<string, Record<string, unknown>>).name?.[
        'minLength'
      ],
    ).toBe(1);
  });

  it('emits no required array — shape is declared, validation is the repository author job', () => {
    expect(views.form?.json_schema?.['required']).toBeUndefined();
  });

  it('renders an object column with a displayKey as a RecordCell', () => {
    const element = elementsOf(views.table).find(
      (e) => e.scope === '#/properties/type',
    );
    expect(element?.type).toBe('RecordCell');
  });

  it('gives an object form control the object format so a renderer matches', () => {
    const element = elementsOf(views.form).find(
      (e) => e.scope === '#/properties/type',
    );
    expect(element?.options?.['format']).toBe('object');
  });

  it('gives an array form control the array format', () => {
    const element = elementsOf(views.form).find(
      (e) => e.scope === '#/properties/tags',
    );
    expect(element?.options?.['format']).toBe('array');
  });

  it('patches filter hints from the column types', () => {
    const properties = propertiesOf(views.filter);
    expect(Object.keys(properties).sort()).toEqual(['title', 'year']);
    expect(properties.year?.['x-field-type']).toBe('number');
    expect(properties.title?.['title']).toBe('Title');
  });

  it('resolves a default sort', () => {
    expect(views.table.defaultSort).toBe('title');
  });

  it('enables additionalProperties so extra payload keys pass validation', () => {
    expect(views.form?.json_schema?.['additionalProperties']).toBe(true);
  });

  it('returns only an empty table view with no columns', () => {
    const v = buildLayouts(undefined, {
      columns: [],
      source: columnTypeSchemaSource,
      warn: () => undefined,
    });
    expect(v.table).toBeDefined();
    expect(v.table.columns).toEqual([]);
    expect(v.form).toBeUndefined();
  });

  it('excludes relation columns from the json schema', () => {
    const withRelation = buildLayouts(undefined, {
      columns: columnsOf({
        id: { type: 'string', idField: true },
        author: {
          fieldInput: {
            format: 'relation',
            relationType: 'manyToOne',
            resource: '../author/resource.json',
          },
        },
      }),
      source: columnTypeSchemaSource,
      warn: () => undefined,
    });
    expect(propertiesOf(withRelation.table).author).toBeUndefined();
  });
});
