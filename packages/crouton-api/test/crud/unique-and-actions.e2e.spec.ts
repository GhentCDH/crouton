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

describe('GET /api/books/unique — unique check', () => {
  it('returns { unique: false } for an existing isbn', async () => {
    const res = await app.request
      .get('/api/books/unique?field=isbn&value=978-0-441-01384-0')
      .expect(200);
    expect(res.body).toEqual({ unique: false });
  });

  it('returns { unique: true } for a new isbn', async () => {
    const res = await app.request
      .get('/api/books/unique?field=isbn&value=978-0-000-00000-0')
      .expect(200);
    expect(res.body).toEqual({ unique: true });
  });

  it('excludeId skips the current record (edit scenario)', async () => {
    const res = await app.request
      .get(`/api/books/unique?field=isbn&value=978-0-441-01384-0&excludeId=${ids.b1.id}`)
      .expect(200);
    expect(res.body).toEqual({ unique: true });
  });

  it('/unique is not captured by the /:id route', async () => {
    // The /unique path must NOT resolve as a book id lookup
    // (it would 404 as an id if the route order were wrong)
    const res = await app.request
      .get('/api/books/unique?field=isbn&value=test')
      .expect(200);
    expect(res.body).toHaveProperty('unique');
  });

  it('returns 400 for a non-unique field', async () => {
    await app.request
      .get('/api/books/unique?field=title&value=Dune')
      .expect(400);
  });
});
