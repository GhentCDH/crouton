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

describe('error handling', () => {
  it('returns 404 for an unregistered route', async () => {
    await app.request.get('/api/nonexistent-resource').expect(404);
  });

  it('returns 400 for pageSize=0', async () => {
    // pageSize=0 produces a Zod/validation error
    await app.request.get('/api/authors?pageSize=0').expect(400);
  });

  it('returns 400 for pageSize=-1', async () => {
    await app.request.get('/api/authors?pageSize=-1').expect(400);
  });
});
