import { describe, expect, it } from 'vitest';

import { allowedIncludes } from './include';
import { JsonColumnSchema } from '../resource';

const relation = (id: string, extra: Record<string, unknown> = {}) =>
  JsonColumnSchema.parse({
    id,
    relation: { type: 'oneToMany', resource: `./${id}/resource.json` },
    ...extra,
  });

const columns = [
  JsonColumnSchema.parse({ id: 'title', type: 'string' }),
  relation('chapters'),
  relation('notes', { hiddenInTable: true }),
];

describe('allowedIncludes', () => {
  it('uses the hiddenInTable fallback when no table ids are given', () => {
    expect(allowedIncludes(columns)).toEqual(['chapters']);
  });

  it('uses the resolved table layout when provided', () => {
    expect(allowedIncludes(columns, new Set(['chapters', 'notes']))).toEqual([
      'chapters',
      'notes',
    ]);
    expect(allowedIncludes(columns, new Set(['title']))).toEqual([]);
  });

  it('always excludes relations that opt out of embedding', () => {
    const noEmbed = [
      JsonColumnSchema.parse({
        id: 'external',
        relation: { type: 'oneToMany', resource: './x/resource.json', embed: false },
      }),
    ];
    expect(allowedIncludes(noEmbed, new Set(['external']))).toEqual([]);
  });
});
