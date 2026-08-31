import { describe, expect, it } from 'vitest';

import { JsonOperationsSchema } from './Operations.schema';

describe('JsonOperationsSchema — security support', () => {
  it('accepts plain booleans (backwards-compatible)', () => {
    const result = JsonOperationsSchema.parse({
      findAll: true,
      findOne: false,
      create: true,
      update: true,
      patch: true,
      upsert: false,
      delete: true,
    });
    expect(result.findAll).toBe(true);
    expect(result.findOne).toBe(false);
  });

  it('accepts { public: true } on an operation', () => {
    const result = JsonOperationsSchema.parse({
      findAll: { security: { public: true } },
    });
    expect(result.findAll).toEqual({ security: { public: true } });
  });

  it('accepts { guard: "admin" } on an operation', () => {
    const result = JsonOperationsSchema.parse({
      create: { security: { guard: 'admin' } },
    });
    expect(result.create).toEqual({ security: { guard: 'admin' } });
  });

  it('accepts { guard: ["admin", "editor"] } on an operation', () => {
    const result = JsonOperationsSchema.parse({
      update: { security: { guard: ['admin', 'editor'] } },
    });
    expect(result.update).toEqual({
      security: { guard: ['admin', 'editor'] },
    });
  });

  it('defaults missing operations to true', () => {
    const result = JsonOperationsSchema.parse({});
    expect(result.findAll).toBe(true);
    expect(result.findOne).toBe(true);
    expect(result.create).toBe(true);
    expect(result.update).toBe(true);
    expect(result.patch).toBe(true);
    expect(result.delete).toBe(true);
    expect(result.upsert).toBe(false);
  });

  it('keeps upsertOn when security is added to upsert', () => {
    const result = JsonOperationsSchema.parse({
      upsert: {
        upsertOn: ['email'],
        security: { guard: 'admin' },
      },
    });
    expect(result.upsert).toEqual({
      upsertOn: ['email'],
      security: { guard: 'admin' },
    });
  });

  it('rejects { guard: [] } (empty guard array)', () => {
    const result = JsonOperationsSchema.safeParse({
      create: { security: { guard: [] } },
    });
    expect(result.success).toBe(false);
  });
});
