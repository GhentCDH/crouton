import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './harness';
import { seed } from './seed';

let app: Awaited<ReturnType<typeof createTestApp>>;
let ids: Awaited<ReturnType<typeof seed>>;

beforeAll(async () => {
  app = await createTestApp();
  ids = await seed(app.prisma);
});

afterAll(async () => {
  await app.close();
});

describe('manyToOne: author in books findAll', () => {
  it('includes author object in each book row', async () => {
    const res = await app.request.get(`/api/books?filter[]=title:Dune:equals`).expect(200);
    expect(res.body.data).toHaveLength(1);
    const book = res.body.data[0];
    expect(book.author).toBeTruthy();
    expect(book.author).toHaveProperty('id');
    expect(book.author).toHaveProperty('name');
  });
});

describe('oneToMany: loans count in books findAll', () => {
  it('includes a loans count on each book row', async () => {
    const res = await app.request.get(`/api/books?filter[]=title:Dune:equals`).expect(200);
    const dune = res.body.data[0];
    // loans is a sub-resource with relationType:oneToMany — count is merged onto the row
    expect(typeof dune.loans).toBe('number');
    expect(dune.loans).toBe(2); // seeded 2 loans for Dune
  });

  it('Ulysses has 5 loans', async () => {
    const res = await app.request.get(`/api/books?filter[]=title:Ulysses:equals`).expect(200);
    expect(res.body.data[0].loans).toBe(5);
  });
});

describe('hidden oneToMany: reviews not in findAll', () => {
  it('reviews column is absent from findAll rows', async () => {
    const res = await app.request.get(`/api/books?filter[]=title:Dune:equals`).expect(200);
    const dune = res.body.data[0];
    // reviews has hiddenInTable: true — no _count entry in findAll
    expect(dune).not.toHaveProperty('reviews');
  });
});

describe('manyToMany: categories in findOne', () => {
  it('includes categories list in book findOne', async () => {
    const res = await app.request.get(`/api/books/${ids.b1.id}`).expect(200);
    // categories sub-resource is included in findOne
    expect(Array.isArray(res.body.categories)).toBe(true);
    expect(res.body.categories.length).toBeGreaterThan(0);
  });
});
