import { afterEach, describe, expect, it, vi } from 'vitest';

import { ResourceJsonSchema } from './ResourceJson.schema';

const base = {
  name: 'annotation',
  route: 'annotations',
  operations: {},
  columns: {
    id: { idField: true },
    selector: { type: 'string' },
  },
};

afterEach(() => vi.restoreAllMocks());

describe('legacy root `id` is stripped, not fatal', () => {
  it('parses a resource that still carries a root `id`', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const result = ResourceJsonSchema.safeParse({ ...base, id: 'annotation' });

    expect(result.success).toBe(true);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('root \'id\' was removed'),
    );
  });

  it('keeps the route when the root `id` differed from `name` and no route was set', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { route: _route, ...withoutRoute } = base;
    const parsed = ResourceJsonSchema.parse({
      ...withoutRoute,
      id: 'legacy-annotations',
    });

    expect(parsed.route).toBe('legacy-annotations');
  });

  it('does not override an explicit route', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const parsed = ResourceJsonSchema.parse({ ...base, id: 'legacy' });

    expect(parsed.route).toBe('annotations');
  });
});

describe('map-form column keys are stripped with a warning, not fatal', () => {
  it('ignores a redundant `id` that matches the map key', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const result = ResourceJsonSchema.safeParse({
      ...base,
      columns: {
        id: { idField: true },
        selector: { id: 'selector', type: 'string' },
      },
    });

    expect(result.success).toBe(true);
    const selector = (result.data?.columns ?? []).find((c) => c.id === 'selector');
    expect(selector?.type).toBe('string');
    // An id that matches the key still warns so the redundant key gets cleaned up.
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('column "selector": ignoring redundant "id"'),
    );
  });

  it('ignores an `id` that differs from the map key (the map key wins)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const result = ResourceJsonSchema.safeParse({
      ...base,
      columns: {
        id: { idField: true },
        selector: { id: 'renamed', type: 'string' },
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.columns?.map((c) => c.id)).toContain('selector');
    expect(result.data?.columns?.map((c) => c.id)).not.toContain('renamed');
  });

  it('strips unknown column keys and reports them', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const result = ResourceJsonSchema.safeParse({
      ...base,
      columns: {
        id: { idField: true },
        selector: { type: 'string', tpyo: true },
      },
    });

    expect(result.success).toBe(true);
    const selector = (result.data?.columns ?? []).find((c) => c.id === 'selector');
    expect(selector?.type).toBe('string');
    expect(selector as Record<string, unknown>).not.toHaveProperty('tpyo');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('column "selector": ignoring unknown key "tpyo"'),
    );
  });

  it('keeps other removed root keys fatal', () => {
    const result = ResourceJsonSchema.safeParse({ ...base, model: 'Annotation' });

    expect(result.success).toBe(false);
    expect((result.error?.issues ?? []).map((i) => i.path.join('.'))).toContain(
      'model',
    );
  });
});
