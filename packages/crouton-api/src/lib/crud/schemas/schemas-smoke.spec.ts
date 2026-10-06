import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type BootedCase, bootCase } from './test-utils';

describe('schema endpoint smoke test — minimal-prisma', () => {
  let ctx: BootedCase;

  beforeAll(async () => {
    ctx = await bootCase('minimal-prisma');
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it('GET /api/books/schemas → 200', async () => {
    const res = await ctx.http.get('/api/books/schemas');
    expect(res.status).toBe(200);
  });

  it('payload has route, id, uri, operations, schemas', async () => {
    const res = await ctx.http.get('/api/books/schemas');
    expect(res.body).toMatchObject({
      route: 'books',
      id: 'book',
      uri: 'http://localhost:3000/books',
      operations: expect.any(Object),
      schemas: expect.any(Object),
    });
  });
});
