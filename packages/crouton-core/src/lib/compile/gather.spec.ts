import { describe, expect, it } from 'vitest';

import { gatherInput, makeMemoryEnv } from './gather';

const BOOK_RESOURCE = {
  name: 'book',
  route: 'books',
  schemaVersion: 1,
  columns: {
    id: { idField: true },
    authorId: {
      fieldInput: { type: 'autocomplete', resource: './author.resource' },
    },
    categories: {
      fieldInput: { format: 'relation', resource: './category.resource' },
    },
  },
};

const AUTHOR_RESOURCE = { name: 'author', route: 'authors', schemaVersion: 1, columns: {} };
const CATEGORY_RESOURCE = { name: 'category', route: 'categories', schemaVersion: 1, columns: {} };

describe('gatherInput', () => {
  it('returns resource + empty refs when env resolves nothing', async () => {
    const env = makeMemoryEnv();
    const result = await gatherInput(BOOK_RESOURCE, env);
    expect(result.resource).toBe(BOOK_RESOURCE);
    expect(result.refs).toEqual({});
    expect(result.enums).toEqual({});
  });

  it('resolves relation refs by route', async () => {
    const env = makeMemoryEnv({
      author: AUTHOR_RESOURCE,
      category: CATEGORY_RESOURCE,
    });
    const result = await gatherInput(BOOK_RESOURCE, env);
    expect(Object.keys(result.refs)).toContain('authors');
    expect(Object.keys(result.refs)).toContain('categories');
  });

  it('de-duplicates repeated resource paths', async () => {
    const resource = {
      route: 'books',
      columns: {
        a: { fieldInput: { resource: './author.resource' } },
        b: { fieldInput: { resource: './author.resource' } },
      },
    };
    const env = makeMemoryEnv({ author: AUTHOR_RESOURCE });
    const result = await gatherInput(resource, env);
    expect(Object.keys(result.refs).filter((k) => k === 'authors')).toHaveLength(1);
  });

  it('skips remote URLs', async () => {
    const resource = {
      route: 'books',
      columns: {
        ext: { fieldInput: { resource: 'https://other-service/api/users' } },
      },
    };
    const env = makeMemoryEnv({ 'https://other-service/api/users': {} as any });
    const result = await gatherInput(resource, env);
    expect(Object.keys(result.refs)).toHaveLength(0);
  });

  it('passes enums through', async () => {
    const enums = { status: ['active', 'inactive'] } as any;
    const env = makeMemoryEnv();
    const result = await gatherInput(BOOK_RESOURCE, env, enums);
    expect(result.enums).toBe(enums);
  });

  it('includes baseUrl from env', async () => {
    const env = makeMemoryEnv({}, {}, 'http://localhost:3000');
    const result = await gatherInput(BOOK_RESOURCE, env);
    expect(result.baseUrl).toBe('http://localhost:3000');
  });
});
