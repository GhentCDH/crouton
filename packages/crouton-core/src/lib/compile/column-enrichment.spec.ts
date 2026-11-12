import { describe, expect, it } from 'vitest';

import { type JsonColumn, JsonColumnSchema } from '../resource/Column';
import { enrichActionColumns } from './column-enrichment';

const relationCol = (id: string): JsonColumn =>
  JsonColumnSchema.parse({ id, fieldInput: { format: 'relation', resource: `./${id}/resource.json` } });

const optionsOf = (col: JsonColumn | undefined) =>
  col?.fieldInput?.options as Record<string, unknown>;

describe('enrichActionColumns', () => {
  it('nests resourceUri under the parent route for sub-resources', () => {
    const [col] = enrichActionColumns(
      [relationCol('textAuthor')],
      'text',
      [{ column: 'textAuthor', childRoute: 'textAuthor', relationType: 'oneToMany' }],
      '/api',
    ) ?? [];
    expect(optionsOf(col).resourceUri).toBe('/api/text/textAuthor');
    expect(optionsOf(col).resource).toBe('/api/text/textAuthor/schemas');
  });

  it('keeps manyToOne relations on the top-level route', () => {
    const [col] = enrichActionColumns(
      [relationCol('author')],
      'text',
      [{ column: 'author', childRoute: 'author', relationType: 'manyToOne' }],
      '/api',
    ) ?? [];
    expect(optionsOf(col).resourceUri).toBe('/api/author');
    expect(optionsOf(col).resource).toBe('/api/author/schemas');
  });
});
