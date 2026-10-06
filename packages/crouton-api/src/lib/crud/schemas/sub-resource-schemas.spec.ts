/**
 * Sub-resource schema endpoint tests (cases 18–19 from PARSE_SCHEMA_TESTS_PLAN.md).
 *
 * Verifies that a child resource's /schemas endpoint is mounted correctly under the
 * parent's route, and that the parent's /schemas payload carries schemasUri for the
 * relation column.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type BootedCase, bootCase } from './test-utils';

describe('case 18: prisma child in prisma parent (sub-prisma-in-prisma)', () => {
  let ctx: BootedCase;

  beforeAll(async () => {
    ctx = await bootCase('sub-prisma-in-prisma');
  }, 30_000);

  afterAll(async () => {
    await ctx?.cleanup();
  });

  it('GET /api/groups/schemas → 200', async () => {
    const res = await ctx.http.get('/api/groups/schemas');
    expect(res.status).toBe(200);
  });

  it('GET /api/groups/chapter/schemas → 200', async () => {
    const res = await ctx.http.get('/api/groups/chapter/schemas');
    expect(res.status).toBe(200);
  });

  it('child schemas payload has expected shape', async () => {
    const res = await ctx.http.get('/api/groups/chapter/schemas');
    expect(res.body).toMatchObject({
      route: 'chapter',
      idField: 'id',
      operations: expect.any(Object),
    });
  });

  it('parent schemas payload references child schemas endpoint in relation column', async () => {
    const res = await ctx.http.get('/api/groups/schemas');
    const schemas = res.body?.schemas;
    // The relation column options should carry a `resource` key pointing to child schemas
    const allSchemas = schemas ? Object.values(schemas) : [];
    const hasChildRef = allSchemas.some((view: any) => {
      const elements = view?.ui?.elements ?? [];
      return elements.some((el: any) =>
        typeof el?.options?.resource === 'string' &&
        el.options.resource.includes('/schemas'),
      );
    });
    expect(hasChildRef).toBe(true);
  });
});

describe('case 19: custom child in prisma parent (sub-custom-in-prisma)', () => {
  let ctx: BootedCase;

  beforeAll(async () => {
    ctx = await bootCase('sub-custom-in-prisma');
  }, 30_000);

  afterAll(async () => {
    await ctx?.cleanup();
  });

  it('GET /api/groups/schemas → 200', async () => {
    const res = await ctx.http.get('/api/groups/schemas');
    expect(res.status).toBe(200);
  });

  it('GET /api/groups/expense/schemas → 200', async () => {
    const res = await ctx.http.get('/api/groups/expense/schemas');
    expect(res.status).toBe(200);
  });

  it('child payload has custom-kind fields', async () => {
    const res = await ctx.http.get('/api/groups/expense/schemas');
    expect(res.body).toMatchObject({
      route: 'expense',
      idField: 'id',
      idType: 'string',
    });
  });

  it('parent schemas payload references child schemas endpoint in the expense relation column', async () => {
    const res = await ctx.http.get('/api/groups/schemas');
    const schemas = res.body?.schemas;
    const allSchemas = schemas ? Object.values(schemas) : [];
    const hasChildRef = allSchemas.some((view: any) => {
      const elements = view?.ui?.elements ?? [];
      return elements.some((el: any) =>
        typeof el?.options?.resource === 'string' &&
        el.options.resource.includes('/schemas'),
      );
    });
    expect(hasChildRef).toBe(true);
  });
});
