import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp } from './harness';
import { seed } from './seed';

let app: Awaited<ReturnType<typeof createTestApp>>;

beforeAll(async () => {
  app = await createTestApp();
  await seed(app.prisma);
});

afterAll(async () => {
  await app.close();
});

describe('GET /api/authors (findAll)', () => {
  it('returns standard list envelope', async () => {
    const res = await app.request.get('/api/authors').expect(200);
    expect(res.body).toMatchObject({
      data: expect.any(Array),
      request: {
        page: 1,
        pageSize: 20,
        count: expect.any(Number),
        totalPages: expect.any(Number),
      },
    });
  });

  it('paginates correctly', async () => {
    // seed creates 3 authors
    const res = await app.request.get('/api/authors?page=1&pageSize=2').expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.request.count).toBe(3);
    expect(res.body.request.totalPages).toBe(2);

    const p2 = await app.request.get('/api/authors?page=2&pageSize=2').expect(200);
    expect(p2.body.data).toHaveLength(1);
  });

  it('sorts ascending and descending', async () => {
    const asc = await app.request.get('/api/authors?sort=name&sortDir=asc').expect(200);
    const names = asc.body.data.map((a: any) => a.name);
    expect(names).toEqual([...names].sort());

    const desc = await app.request.get('/api/authors?sort=name&sortDir=desc').expect(200);
    const namesDesc = desc.body.data.map((a: any) => a.name);
    expect(namesDesc).toEqual([...namesDesc].sort().reverse());
  });

  it('filters with contains operator (default)', async () => {
    const res = await app.request.get('/api/authors?filter[]=name:herb').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toMatch(/herb/i);
  });

  it('filters with equals operator', async () => {
    const res = await app.request.get('/api/authors?filter[]=name:Austen:equals').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Austen');
  });

  it('count reflects filters', async () => {
    const all = await app.request.get('/api/authors').expect(200);
    const filtered = await app.request.get('/api/authors?filter[]=name:Austen:equals').expect(200);
    expect(filtered.body.request.count).toBeLessThan(all.body.request.count);
    expect(filtered.body.request.count).toBe(1);
  });

  it('q search works', async () => {
    const res = await app.request.get('/api/authors?q=joyce').expect(200);
    expect(res.body.data.some((a: any) => a.name.toLowerCase().includes('joyce'))).toBe(true);
  });
});

describe('GET /api/books (findAll) — pagination with 28 books', () => {
  it('default page returns 20 records', async () => {
    const res = await app.request.get('/api/books').expect(200);
    expect(res.body.data).toHaveLength(20);
    expect(res.body.request.count).toBeGreaterThan(20);
  });

  it('page 2 returns remaining records', async () => {
    const total = (await app.request.get('/api/books').expect(200)).body.request.count;
    const res = await app.request.get('/api/books?page=2&pageSize=20').expect(200);
    expect(res.body.data.length).toBe(total - 20);
  });
});

describe('GET /api/books (findAll) — enum column', () => {
  it('status column emits {value, label} when enum is configured', async () => {
    const res = await app.request.get('/api/books?filter[]=title:Dune:equals').expect(200);
    expect(res.body.data).toHaveLength(1);
    const book = res.body.data[0];
    // status is an enum column — emitted as { value, label }
    expect(book.status).toMatchObject({ value: 'published', label: 'Published' });
  });
});

describe('GET /api/tags (integer id)', () => {
  it('returns integer ids', async () => {
    const res = await app.request.get('/api/tags').expect(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(typeof res.body.data[0].id).toBe('number');
  });
});

describe('GET /api/shelves (custom idField)', () => {
  it('returns code as the id field', async () => {
    const res = await app.request.get('/api/shelves').expect(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('code');
  });
});
