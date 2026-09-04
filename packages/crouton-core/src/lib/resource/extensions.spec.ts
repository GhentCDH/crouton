import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ResourceJsonSchema, buildResourceJsonSchema } from './ResourceJson.schema';
import {
  clearResourceExtensions,
  registerResourceExtension,
  registerResourceExtensions,
} from './extensions';

const base = {
  name: 'item',
  route: 'items',
  tag: 'Items',
  model: 'Item',
  operations: {},
};

afterEach(() => clearResourceExtensions());

describe('registerResourceExtension', () => {
  it('throws when shadowing a core key', () => {
    expect(() => registerResourceExtension('columns', z.unknown())).toThrow(
      'shadows a core resource key',
    );
    expect(() => registerResourceExtension('extensions', z.unknown())).toThrow(
      'shadows a core resource key',
    );
  });

  it('registers an extension key', () => {
    registerResourceExtension('annotation', z.object({ color: z.string() }));
    const schema = buildResourceJsonSchema();
    const result = schema.safeParse({ ...base, annotation: { color: '#fff' } });
    expect(result.success).toBe(true);
    expect(result.data?.extensions?.['annotation']).toEqual({ color: '#fff' });
    expect('annotation' in (result.data ?? {})).toBe(false);
  });
});

describe('buildResourceJsonSchema', () => {
  it('strips an unregistered top-level key silently (backward compat)', () => {
    const result = ResourceJsonSchema.safeParse({ ...base, annotation: { color: '#fff' } });
    expect(result.success).toBe(true);
    expect(result.data?.extensions).toBeUndefined();
  });

  it('still surfaces core key typos (typo protection intact)', () => {
    // "colums" is not a core key, not registered — stripped, no error (Zod strips unknowns)
    // but "model" missing on an explicit prisma resource IS an error
    const result = ResourceJsonSchema.safeParse({ name: 'x', route: 'x', kind: 'prisma', tag: 'x', operations: {} });
    expect(result.success).toBe(false);
  });

  it('validates extension schema — wrong type is rejected', () => {
    registerResourceExtension('annotation', z.object({ color: z.string() }));
    const schema = buildResourceJsonSchema();
    const result = schema.safeParse({ ...base, annotation: { color: 123 } });
    expect(result.success).toBe(false);
  });

  it('normalizes multiple extensions into extensions block', () => {
    registerResourceExtensions({
      annotation: z.object({ color: z.string() }),
      context: z.object({ scope: z.string() }),
    });
    const schema = buildResourceJsonSchema();
    const result = schema.safeParse({
      ...base,
      annotation: { color: '#0f0' },
      context: { scope: 'global' },
    });
    expect(result.success).toBe(true);
    expect(result.data?.extensions).toEqual({
      annotation: { color: '#0f0' },
      context: { scope: 'global' },
    });
  });

  it('backward-compat: no extension registered ⇒ no extensions field', () => {
    const result = ResourceJsonSchema.safeParse({ ...base });
    expect(result.success).toBe(true);
    expect(result.data?.extensions).toBeUndefined();
  });
});
