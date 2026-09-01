import { describe, expect, it } from 'vitest';

import type { DataSourceAdapter } from './data-source.adapter';
import { InMemoryDataSourceAdapter } from './in-memory.adapter';
import { PrismaDataSourceAdapter } from './prisma.adapter';

const makeAdapters = (): { label: string; adapter: DataSourceAdapter }[] => [
  {
    label: 'PrismaDataSourceAdapter',
    adapter: new PrismaDataSourceAdapter({ user: {}, post: {} }),
  },
  {
    label: 'InMemoryDataSourceAdapter',
    adapter: new InMemoryDataSourceAdapter(),
  },
];

describe.each(makeAdapters())('DataSourceAdapter contract — $label', ({ adapter }) => {
  it('has a non-empty kind string', () => {
    expect(typeof adapter.kind).toBe('string');
    expect(adapter.kind.length).toBeGreaterThan(0);
  });

  it('supports() returns a boolean', () => {
    const result = adapter.supports?.('anyModel');
    // supports is optional on the interface; both implementations define it
    expect(typeof result).toBe('boolean');
  });

  it('disconnect() resolves without throwing', async () => {
    await expect(adapter.disconnect?.()).resolves.not.toThrow();
  });
});

describe('PrismaDataSourceAdapter', () => {
  it('supports() returns true for a model present on the client', () => {
    const a = new PrismaDataSourceAdapter({ user: {}, post: {} });
    expect(a.supports('user')).toBe(true);
    expect(a.supports('post')).toBe(true);
    expect(a.supports('unknown')).toBe(false);
  });

  it('exposes the raw client', () => {
    const client = { user: {} };
    const a = new PrismaDataSourceAdapter(client);
    expect(a.client).toBe(client);
  });
});

describe('InMemoryDataSourceAdapter', () => {
  it('supports() returns false for an unseeded model', () => {
    const a = new InMemoryDataSourceAdapter();
    expect(a.supports('anything')).toBe(false);
  });

  it('supports() returns true after seeding', () => {
    const a = new InMemoryDataSourceAdapter();
    a.seed('user', [{ id: 1, name: 'Alice' }]);
    expect(a.supports('user')).toBe(true);
    expect(a.supports('post')).toBe(false);
  });

  it('client is undefined', () => {
    const a = new InMemoryDataSourceAdapter();
    expect(a.client).toBeUndefined();
  });
});
