import { describe, expect, it } from 'vitest';
import z from 'zod';

import { ResourceJsonSchema } from '@ghentcdh/crouton-core';

import { fromJson } from './adapter';
import {
  buildDefinitionPayload,
  buildResourceJsonPayload,
  buildViewsPayload,
} from './operations/payload-builders';
import { parseSchema } from './parse-schema';

const BASE_URL = 'http://localhost:3000';
const APP_CONFIG = { baseUrl: BASE_URL };

const PRISMA_RAW = {
  name: 'article',
  route: 'articles',
  tag: 'Articles',
  kind: 'prisma',
  model: 'Article',
  operations: { findAll: true, findOne: true, create: true, update: true, delete: true },
  columns: {
    id: { type: 'string', idField: true },
    title: { type: 'string', searchable: true, sortable: true },
  },
};
const PRISMA_JSON = ResourceJsonSchema.parse(PRISMA_RAW);
const PRISMA_SCHEMA = z.object({ id: z.string(), title: z.string() });

const CUSTOM_RAW = {
  name: 'note',
  route: 'notes',
  tag: 'Notes',
  kind: 'custom',
  operations: { findAll: true, findOne: true },
  columns: {
    id: { type: 'string', idField: true },
    body: { type: 'string' },
  },
};

describe('parseSchema', () => {
  it('prisma resource → schemas view matches buildViewsPayload', () => {
    const expected = buildViewsPayload(
      fromJson(PRISMA_JSON, PRISMA_SCHEMA, undefined),
      BASE_URL,
    );
    const result = parseSchema(
      { json: PRISMA_RAW, schema: PRISMA_SCHEMA },
      APP_CONFIG,
      'schemas',
    );
    expect(result).toEqual(expected);
  });

  it('custom resource (no schema) → non-empty schemas payload', () => {
    const result = parseSchema({ json: CUSTOM_RAW }, APP_CONFIG, 'schemas');
    expect(result).toBeDefined();
    expect(result?.schemas).toBeDefined();
  });

  it('definition view matches buildDefinitionPayload', () => {
    const expected = buildDefinitionPayload(
      fromJson(PRISMA_JSON, PRISMA_SCHEMA, undefined),
    );
    const result = parseSchema(
      { json: PRISMA_RAW, schema: PRISMA_SCHEMA },
      APP_CONFIG,
      'definition',
    );
    expect(result).toEqual(expected);
  });

  it('resource.json view matches buildResourceJsonPayload', () => {
    const expected = buildResourceJsonPayload(
      fromJson(PRISMA_JSON, PRISMA_SCHEMA, undefined),
      BASE_URL,
    );
    const result = parseSchema(
      { json: PRISMA_RAW, schema: PRISMA_SCHEMA },
      APP_CONFIG,
      'resource.json',
    );
    expect(result).toEqual(expected);
  });

  it('schemaEnricher merged into payload', () => {
    const result = parseSchema(
      { json: PRISMA_RAW, schema: PRISMA_SCHEMA },
      { baseUrl: BASE_URL, schemaEnricher: () => ({ extra: 'injected' }) },
      'schemas',
    );
    expect(result?.extra).toBe('injected');
  });

  it('extensions reflected via registerResourceExtensions', () => {
    const ext = z.object({ mySection: z.string().optional() });
    const result = parseSchema(
      { json: PRISMA_RAW, schema: PRISMA_SCHEMA },
      { baseUrl: BASE_URL, extensions: { mySection: ext } },
      'schemas',
    );
    expect(result).toBeDefined();
  });

  it('buildViewsPayload returns undefined for a Resource with no views (documents builder contract)', () => {
    // parseSchema always generates views via fromJson; this tests the underlying
    // builder directly so callers know to handle undefined.
    const noViewsJson = ResourceJsonSchema.parse({
      name: 'bare',
      route: 'bare',
      tag: 'Bare',
      kind: 'custom',
      operations: {},
      columns: { id: { type: 'string', idField: true } },
    });
    const resource = fromJson(noViewsJson, undefined, undefined);
    // Manually wipe views to simulate a no-views Resource
    const result = buildViewsPayload({ ...resource, views: undefined }, BASE_URL);
    expect(result).toBeUndefined();
  });

  it('bare json object (not wrapped in ParseSchemaInput) is accepted', () => {
    const result = parseSchema(CUSTOM_RAW, APP_CONFIG, 'schemas');
    expect(result).toBeDefined();
  });

  it('invalid json throws a clear error', () => {
    expect(() => parseSchema({ json: { bad: true } }, APP_CONFIG)).toThrow(
      /Resource cannot be parsed/,
    );
  });
});
