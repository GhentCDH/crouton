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

describe('GET /api/books/:id/loans (sub-resource findAll)', () => {
  it('returns only the loans for that book', async () => {
    const res = await app.request.get(`/api/books/${ids.b1.id}/loans`).expect(200);
    expect(res.body.data).toHaveLength(2); // Dune has 2 loans
    expect(res.body.data.every((l: any) => l.bookId === ids.b1.id)).toBe(true);
  });

  it('Ulysses has 5 loans', async () => {
    const res = await app.request.get(`/api/books/${ids.b3.id}/loans`).expect(200);
    expect(res.body.data).toHaveLength(5);
  });

  it('book with no loans returns empty data', async () => {
    const res = await app.request.get(`/api/books/${ids.b2.id}/loans`).expect(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('returns 404 for unknown parent book', async () => {
    await app.request.get('/api/books/does-not-exist/loans').expect(404);
  });
});

describe('POST /api/books/:id/loans (sub-resource create)', () => {
  it('creates a loan linked to the parent book', async () => {
    const res = await app.request
      .post(`/api/books/${ids.b2.id}/loans`)
      .send({})
      .expect(201);
    expect(res.body.bookId).toBe(ids.b2.id);

    // Verify in db
    const loan = await app.prisma.loan.findUnique({ where: { id: res.body.id } });
    expect(loan).not.toBeNull();
    expect(loan.bookId).toBe(ids.b2.id);
  });
});
