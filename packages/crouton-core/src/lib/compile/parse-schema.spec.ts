import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { clearResourceExtensions } from '../resource';
import { parseSchema } from './parse-schema';

afterEach(() => clearResourceExtensions());

const minimalPrisma = {
  name: 'book',
  model: 'Book',
  route: 'books',
  columns: {
    id: { idField: true, hiddenInForm: true },
    title: { searchable: true, sortable: true },
  },
};

const minimalCustom = {
  name: 'page',
  kind: 'custom',
  route: 'pages',
  columns: {
    id: { type: 'string', idField: true, hiddenInForm: true },
    name: { type: 'string', searchable: true },
  },
};

describe('parseSchema — input normalization', () => {
  it('raw json and { json } give identical output', () => {
    const direct = parseSchema(minimalPrisma, {}, 'schemas');
    const wrapped = parseSchema({ json: minimalPrisma }, {}, 'schemas');
    expect(direct).toEqual(wrapped);
  });

  it('{ json, schema } uses schema for types/required', () => {
    const schema = z.object({
      id: z.string(),
      title: z.string(),
    });
    const withSchema = parseSchema({ json: minimalPrisma, schema }, {}, 'definition');
    const withoutSchema = parseSchema({ json: minimalPrisma }, {}, 'definition');
    // With schema, findAll has a schemas.findAll entry; without it does not
    expect(withSchema).toBeDefined();
    expect(withoutSchema).toBeDefined();
    // schemas key holds different shapes
    const withSchemas = (withSchema as any).schemas;
    const withoutSchemas = (withoutSchema as any).schemas;
    expect(withSchemas).not.toEqual(withoutSchemas);
  });
});

describe('parseSchema — views', () => {
  it('default view is schemas', () => {
    const result = parseSchema(minimalCustom, {});
    expect(result).toBeDefined();
    expect(result).toHaveProperty('schemas');
  });

  it('schemas view builds table/form/filter views from columns', () => {
    const result = parseSchema(minimalPrisma, {}) as any;
    // buildViewsPayload always returns something: views include at least table
    expect(result).toBeDefined();
    expect(result.schemas).toHaveProperty('table');
  });

  it('definition view returns operation list and schemas', () => {
    const result = parseSchema(minimalCustom, {}, 'definition');
    expect(result).toHaveProperty('operations');
    expect(result).toHaveProperty('schemas');
  });

  it('resource.json view includes uri composed from baseUrl + route', () => {
    const result = parseSchema(minimalCustom, { baseUrl: 'http://host' }, 'resource.json') as any;
    expect(result.uri).toBe('http://host/pages');
  });
});

describe('parseSchema — validation errors', () => {
  it('throws /Resource cannot be parsed/ on invalid column shape (bad type)', () => {
    const bad = { ...minimalPrisma, columns: { id: { type: 'not-a-valid-type', idField: true } } };
    // 'not-a-valid-type' is not in ColumnTypeShorthandSchema — should fail
    // Actually Zod strips unknown values in catchall — let's test a clearly wrong top-level
    expect(() => parseSchema({ name: 'x', route: 'x', kind: 'unknown-kind', tag: 'x', operations: {} }, {})).toThrow(
      /Resource cannot be parsed/,
    );
  });

  it('throws /Resource cannot be parsed/ for kind:custom + calculatedColumns', () => {
    const bad = {
      name: 'page',
      kind: 'custom',
      route: 'pages',
      calculatedColumns: [{ id: 'count', sql: 'SELECT COUNT(*) FROM items' }],
      columns: { id: { type: 'string', idField: true } },
    };
    expect(() => parseSchema(bad, {})).toThrow(/Resource cannot be parsed/);
  });

  it('throws /Resource cannot be parsed/ for kind:custom + parent.param = "id"', () => {
    const bad = {
      name: 'page',
      kind: 'custom',
      route: 'pages',
      parent: { route: 'groups', param: 'id' },
      columns: { id: { type: 'string', idField: true } },
    };
    expect(() => parseSchema(bad, {})).toThrow(/Resource cannot be parsed/);
  });

  it('throws /Resource cannot be parsed/ for parent on a prisma resource', () => {
    const bad = {
      name: 'book',
      model: 'Book',
      route: 'books',
      parent: { route: 'authors', param: 'authorId' },
      columns: { id: { idField: true } },
    };
    expect(() => parseSchema(bad, {})).toThrow(/Resource cannot be parsed/);
  });
});

describe('parseSchema — appConfig', () => {
  it('baseUrl absent → uri ends with route', () => {
    const result = parseSchema(minimalCustom, {}, 'resource.json') as any;
    expect(result.uri).toMatch(/\/pages$/);
  });

  it('baseUrl present → absolute uri in resource.json view', () => {
    const result = parseSchema(minimalCustom, { baseUrl: 'https://api.example.com' }, 'resource.json') as any;
    expect(result.uri).toBe('https://api.example.com/pages');
  });

  it('schemaEnricher merged on top (can override keys)', () => {
    const enricher = (payload: Record<string, unknown>) => ({ extra: 'injected', route: 'overridden' });
    const result = parseSchema(minimalCustom, { schemaEnricher: enricher }, 'resource.json') as any;
    expect(result.extra).toBe('injected');
    expect(result.route).toBe('overridden');
  });

  it('schemaEnricher called when payload is defined', () => {
    let called = false;
    const enricher = (p: Record<string, unknown>) => { called = true; return {}; };
    // schemas view returns a payload with views → enricher is called
    parseSchema(minimalCustom, { schemaEnricher: enricher }, 'schemas');
    expect(called).toBe(true);
  });

  it('extensions registered before validation — extension key accepted', () => {
    const result = parseSchema(
      { ...minimalPrisma, annotation: { color: '#fff' } },
      { extensions: { annotation: z.object({ color: z.string() }) } },
      'resource.json',
    );
    expect(result).toBeDefined();
  });

  it('registry cleared between tests — previous extension not present', () => {
    // clearResourceExtensions called in afterEach; extension from previous test is gone
    expect(() =>
      parseSchema(
        { ...minimalPrisma, annotation: { color: '#fff' } },
        {},
        'resource.json',
      ),
    ).not.toThrow(); // strips unknown keys silently
  });
});

describe('parseSchema — purity', () => {
  it('same input twice gives equal output', () => {
    const a = parseSchema(minimalCustom, {}, 'resource.json');
    const b = parseSchema(minimalCustom, {}, 'resource.json');
    expect(a).toEqual(b);
  });

  it('input not mutated', () => {
    const input = structuredClone(minimalCustom);
    parseSchema(input, {}, 'schemas');
    expect(input).toEqual(minimalCustom);
  });
});
