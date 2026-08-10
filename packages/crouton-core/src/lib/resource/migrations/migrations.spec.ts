import { describe, expect, it } from 'vitest';

import {
  MIGRATIONS,
  MigrationPathError,
  MigrationStepError,
  type ResourceMigration,
  resourceVersionOf,
  runResourceMigrations,
} from './index';

import { CURRENT_RESOURCE_VERSION } from '../version';

const step = (
  from: number,
  migrate: ResourceMigration['migrate'],
): ResourceMigration => ({ from, to: from + 1, description: `${from}→${from + 1}`, migrate });

describe('resourceVersionOf', () => {
  it('defaults a missing field to the baseline (1)', () => {
    expect(resourceVersionOf({})).toBe(1);
    expect(resourceVersionOf({ schemaVersion: 3 })).toBe(3);
    expect(resourceVersionOf({ schemaVersion: 'x' as unknown as number })).toBe(1);
  });
});

describe('MIGRATIONS registry', () => {
  it('is a contiguous chain ending at CURRENT_RESOURCE_VERSION', () => {
    const sorted = [...MIGRATIONS].sort((a, b) => a.from - b.from);
    sorted.forEach((m, i) => {
      expect(m.to).toBe(m.from + 1); // each step is single-version
      if (i > 0) expect(m.from).toBe(sorted[i - 1].to); // no gaps
    });
    if (sorted.length) {
      expect(sorted[0].from).toBe(1); // starts at baseline
      expect(sorted[sorted.length - 1].to).toBe(CURRENT_RESOURCE_VERSION); // reaches current
    } else {
      expect(CURRENT_RESOURCE_VERSION).toBe(1); // empty chain ⇒ current is still baseline
    }
  });
});

describe('runResourceMigrations', () => {
  it('is a no-op when already at target (no schemaVersion rewrite)', () => {
    const raw = { schemaVersion: 2, name: 'a' };
    const r = runResourceMigrations(raw, 2, []);
    expect(r).toEqual({ raw, from: 2, to: 2, applied: [] });
    expect(r.raw).toBe(raw); // same reference
  });

  it('applies steps in order and stamps the target version first', () => {
    const chain = [
      step(1, (raw) => ({ ...raw, a: true })),
      step(2, (raw) => ({ ...raw, b: true })),
    ];
    const r = runResourceMigrations({ name: 'x' }, 3, chain); // missing field ⇒ from 1
    expect(r.from).toBe(1);
    expect(r.to).toBe(3);
    expect(r.applied).toEqual(['1→2', '2→3']);
    expect(r.raw).toEqual({ schemaVersion: 3, name: 'x', a: true, b: true });
    expect(Object.keys(r.raw)[0]).toBe('schemaVersion'); // leads with version
  });

  it('throws MigrationPathError on a gap in the chain', () => {
    const chain = [step(2, (raw) => raw)]; // no 1→2
    expect(() => runResourceMigrations({ schemaVersion: 1 }, 3, chain)).toThrow(
      MigrationPathError,
    );
  });

  it('throws MigrationPathError when the file is newer than the target', () => {
    expect(() => runResourceMigrations({ schemaVersion: 5 }, 2, [])).toThrow(
      MigrationPathError,
    );
  });

  it('wraps a throwing step in MigrationStepError', () => {
    const chain = [
      step(1, () => {
        throw new Error('boom');
      }),
    ];
    expect(() => runResourceMigrations({ schemaVersion: 1 }, 2, chain)).toThrow(
      MigrationStepError,
    );
  });

  it('is idempotent — re-running a migrated object is a no-op', () => {
    const chain = [step(1, (raw) => ({ ...raw, a: 1 }))];
    const once = runResourceMigrations({ name: 'x' }, 2, chain);
    const twice = runResourceMigrations(once.raw, 2, chain);
    expect(twice.applied).toEqual([]);
    expect(twice.raw).toEqual(once.raw);
  });
});
