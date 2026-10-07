import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from './harness';
import { seed } from './seed';

let app: Awaited<ReturnType<typeof createTestApp>>;
let ids: Awaited<ReturnType<typeof seed>>;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

// Reseed before each write test to ensure a clean state
beforeEach(async () => {
  ids = await seed(app.prisma);
});

describe('POST /api/authors (create)', () => {
  it('creates a record and returns 201', async () => {
    const res = await app.request
      .post('/api/authors')
      .send({ name: 'Tolkien' })
      .expect(201);
    expect(res.body).toMatchObject({ name: 'Tolkien' });
    expect(res.body.id).toBeTruthy();

    const inDb = await app.prisma.author.findUnique({ where: { id: res.body.id } });
    expect(inDb).not.toBeNull();
    expect(inDb.name).toBe('Tolkien');
  });

  it('returns 400 when required field is missing', async () => {
    await app.request.post('/api/authors').send({}).expect(400);
  });
});

describe('PUT /api/authors/:id (update)', () => {
  it('replaces the record', async () => {
    const res = await app.request
      .put(`/api/authors/${ids.a1.id}`)
      .send({ name: 'Frank Herbert' })
      .expect(200);
    expect(res.body).toMatchObject({ name: 'Frank Herbert' });
  });

  it('returns 404 for unknown id', async () => {
    await app.request
      .put('/api/authors/does-not-exist')
      .send({ name: 'Ghost' })
      .expect(404);
  });
});

describe('PATCH /api/books/:id (patch)', () => {
  it('updates only sent fields', async () => {
    const original = await app.prisma.book.findUnique({ where: { id: ids.b1.id } });
    const res = await app.request
      .patch(`/api/books/${ids.b1.id}`)
      .send({ title: 'Dune Messiah' })
      .expect(200);
    expect(res.body.title).toBe('Dune Messiah');
    // authorId unchanged
    expect(res.body.authorId).toBe(original.authorId);
  });

  it('returns 404 for unknown id', async () => {
    await app.request
      .patch('/api/books/does-not-exist')
      .send({ title: 'Ghost' })
      .expect(404);
  });
});

describe('DELETE /api/authors/:id', () => {
  it('deletes the record', async () => {
    // Create a deletable author first
    const created = await app.prisma.author.create({ data: { name: 'Temp Author' } });
    await app.request.delete(`/api/authors/${created.id}`).expect(200);

    const inDb = await app.prisma.author.findUnique({ where: { id: created.id } });
    expect(inDb).toBeNull();
  });

  it('returns 404 for unknown id', async () => {
    await app.request.delete('/api/authors/does-not-exist').expect(404);
  });
});

describe('POST /api/categories — unique slug violation', () => {
  it('returns an error when slug already exists', async () => {
    await app.request.post('/api/categories').send({ name: 'Sci-Fi Dup', slug: 'sci-fi' }).expect(400);
  });
});
