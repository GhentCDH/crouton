import type { JsonSchema } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';

import { findProperty } from './schema.utils';

const schema = {
  type: 'object',
  properties: {
    title: { type: 'string', title: 'Title' },
    metadata: {
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name' },
        nested: {
          type: 'object',
          properties: { deep: { type: 'integer' } },
        },
      },
    },
  },
} as unknown as JsonSchema;

describe('findProperty', () => {
  it('resolves a top-level scope', () => {
    expect(findProperty({ scope: '#/properties/title' }, schema)).toEqual({
      id: 'title',
      property: { type: 'string', title: 'Title' },
    });
  });

  it('resolves a nested scope', () => {
    const { property } = findProperty(
      { scope: '#/properties/metadata/properties/name' },
      schema,
    );
    expect(property).toEqual({ type: 'string', title: 'Name' });
  });

  it('resolves a deeply nested scope', () => {
    const { property } = findProperty(
      { scope: '#/properties/metadata/properties/nested/properties/deep' },
      schema,
    );
    expect(property).toEqual({ type: 'integer' });
  });

  it('returns an empty property for an unknown key', () => {
    expect(findProperty({ scope: '#/properties/nope' }, schema).property).toEqual(
      {},
    );
    expect(
      findProperty({ scope: '#/properties/metadata/properties/nope' }, schema)
        .property,
    ).toEqual({});
  });

  it('keeps the full path as the id', () => {
    expect(
      findProperty({ scope: '#/properties/metadata/properties/name' }, schema)
        .id,
    ).toBe('metadata/properties/name');
  });

  it('handles a missing scope', () => {
    expect(findProperty({ scope: '' }, schema)).toEqual({
      id: null,
      property: null,
    });
  });

  it('tolerates a schema with no properties', () => {
    expect(
      findProperty({ scope: '#/properties/title' }, {} as JsonSchema).property,
    ).toEqual({});
  });
});
