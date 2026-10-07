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

describe('GET /api/authors/:id', () => {
  it('returns a single author by string id', async () => {
    const res = await app.request.get(`/api/authors/${ids.a1.id}`).expect(200);
    expect(res.body).toMatchObject({ id: ids.a1.id, name: 'Herbert' });
  });

  it('returns 404 for unknown id', async () => {
    await app.request.get('/api/authors/does-not-exist').expect(404);
  });
});

describe('GET /api/tags/:id (integer id)', () => {
  it('returns a tag by integer id', async () => {
    const res = await app.request.get(`/api/tags/${ids.t1.id}`).expect(200);
    expect(res.body).toMatchObject({ id: ids.t1.id, label: 'tag1' });
  });

  it('returns 404 for unknown integer id', async () => {
    await app.request.get('/api/tags/999999').expect(404);
  });
});

describe('GET /api/shelves/:code (custom idField)', () => {
  it('returns a shelf by code', async () => {
    const res = await app.request.get('/api/shelves/MAIN').expect(200);
    expect(res.body).toMatchObject({ code: 'MAIN', name: 'Main Hall' });
  });

  it('returns 404 for unknown code', async () => {
    await app.request.get('/api/shelves/UNKNOWN').expect(404);
  });
});

describe('GET /api/books/:id', () => {
  it('includes author relation in findOne', async () => {
    const res = await app.request.get(`/api/books/${ids.b1.id}`).expect(200);
    expect(res.body).toMatchObject({ id: ids.b1.id, title: 'Dune' });
    // author is a manyToOne autocomplete — included in findOne via sub-resource
    expect(res.body).toHaveProperty('author');
  });
});
