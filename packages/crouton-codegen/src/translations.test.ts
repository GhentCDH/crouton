import { describe, expect, it } from 'vitest';

import type { ResourceJson, TranslationBundle } from '@ghentcdh/crouton-core';

import type { EnumRegistry } from './enum-registry';
import {
  buildTranslationBundle,
  findStaleKeys,
  mergeTranslationBundle,
  serializeTranslationBundle,
} from './translations';

// ── fixtures ────────────────────────────────────────────────────────

const resource = (
  overrides: Partial<ResourceJson> & { name: string },
): ResourceJson =>
  ({
    name: overrides.name,
    route: overrides.route ?? overrides.name,
    tag: overrides.tag ?? overrides.name,
    kind: 'prisma' as const,
    title: overrides.title,
    columns: overrides.columns ?? [],
    actions: overrides.actions ?? [],
    tableActions: overrides.tableActions ?? [],
    sidebar: overrides.sidebar ?? {},
    ...overrides,
  }) as unknown as ResourceJson;

const enums: EnumRegistry = {
  Status: [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'ARCHIVED', label: 'Archived' },
  ],
};

// ── buildTranslationBundle ──────────────────────────────────────────

describe('buildTranslationBundle', () => {
  it('creates resource entries with title and column labels', () => {
    const res = resource({
      name: 'group',
      title: 'Groups',
      columns: [
        { id: 'name', label: 'Name' },
        { id: 'description', label: 'Description' },
      ] as ResourceJson['columns'],
    });

    const bundle = buildTranslationBundle([res], {});
    expect(bundle.resources?.group).toEqual({
      title: 'Groups',
      columns: {
        name: 'Name',
        description: 'Description',
      },
    });
  });

  it('falls back to labelFromId when title is missing', () => {
    const res = resource({ name: 'text_type' });
    const bundle = buildTranslationBundle([res], {});
    expect(bundle.resources?.text_type?.title).toBe('Text type');
  });

  it('falls back to labelFromId for column label', () => {
    const res = resource({
      name: 'group',
      title: 'Groups',
      columns: [{ id: 'author_name' }] as ResourceJson['columns'],
    });
    const bundle = buildTranslationBundle([res], {});
    expect(bundle.resources?.group?.columns?.author_name).toBe(
      'Author name',
    );
  });

  it('includes sidebar label when present', () => {
    const res = resource({
      name: 'group',
      title: 'Groups',
      sidebar: { label: 'My Groups' },
    });
    const bundle = buildTranslationBundle([res], {});
    expect(bundle.resources?.group?.sidebar).toBe('My Groups');
  });

  it('omits sidebar when no explicit label', () => {
    const res = resource({ name: 'group', title: 'Groups' });
    const bundle = buildTranslationBundle([res], {});
    expect(bundle.resources?.group?.sidebar).toBeUndefined();
  });

  it('includes action labels', () => {
    const res = resource({
      name: 'group',
      title: 'Groups',
      actions: [
        { id: 'publish', label: 'Publish', type: 'procedure' },
      ] as ResourceJson['actions'],
    });
    const bundle = buildTranslationBundle([res], {});
    expect(bundle.resources?.group?.actions?.publish).toBe('Publish');
  });

  it('builds enum section from registry', () => {
    const bundle = buildTranslationBundle([], enums);
    expect(bundle.enums).toEqual({
      Status: { ACTIVE: 'Active', ARCHIVED: 'Archived' },
    });
  });

  it('returns empty bundle for empty inputs', () => {
    const bundle = buildTranslationBundle([], {});
    expect(bundle.resources).toBeUndefined();
    expect(bundle.enums).toBeUndefined();
  });
});

// ── mergeTranslationBundle ──────────────────────────────────────────

describe('mergeTranslationBundle', () => {
  it('preserves existing hand-edited values', () => {
    const existing: TranslationBundle = {
      resources: {
        group: {
          title: 'Groepen (custom)',
          columns: { name: 'Naam' },
        },
      },
    };
    const generated: TranslationBundle = {
      resources: {
        group: {
          title: 'Groups',
          columns: { name: 'Name' },
        },
      },
    };
    const merged = mergeTranslationBundle(existing, generated);
    expect(merged.resources?.group?.title).toBe('Groepen (custom)');
    expect(merged.resources?.group?.columns?.name).toBe('Naam');
  });

  it('appends new keys from generated', () => {
    const existing: TranslationBundle = {
      resources: {
        group: { title: 'Groepen', columns: { name: 'Naam' } },
      },
    };
    const generated: TranslationBundle = {
      resources: {
        group: {
          title: 'Groups',
          columns: { name: 'Name', description: 'Description' },
        },
      },
    };
    const merged = mergeTranslationBundle(existing, generated);
    expect(merged.resources?.group?.columns?.description).toBe(
      'Description',
    );
  });

  it('keeps keys that only exist in existing (not pruned)', () => {
    const existing: TranslationBundle = {
      resources: {
        group: {
          title: 'Groepen',
          columns: { old_col: 'Oude kolom' },
        },
      },
    };
    const generated: TranslationBundle = {
      resources: {
        group: { title: 'Groups' },
      },
    };
    const merged = mergeTranslationBundle(existing, generated);
    expect(
      (merged.resources?.group as Record<string, unknown>)?.columns,
    ).toEqual({ old_col: 'Oude kolom' });
  });

  it('adds entirely new resources', () => {
    const existing: TranslationBundle = {
      resources: { group: { title: 'Groepen' } },
    };
    const generated: TranslationBundle = {
      resources: {
        group: { title: 'Groups' },
        user: { title: 'Users' },
      },
    };
    const merged = mergeTranslationBundle(existing, generated);
    expect(merged.resources?.user?.title).toBe('Users');
  });

  it('preserves key order (existing first)', () => {
    const existing: TranslationBundle = {
      resources: {
        group: { columns: { b: 'B', a: 'A' } },
      },
    };
    const generated: TranslationBundle = {
      resources: {
        group: { columns: { a: 'A', b: 'B', c: 'C' } },
      },
    };
    const merged = mergeTranslationBundle(existing, generated);
    const keys = Object.keys(merged.resources?.group?.columns ?? {});
    expect(keys).toEqual(['b', 'a', 'c']);
  });
});

// ── findStaleKeys ───────────────────────────────────────────────────

describe('findStaleKeys', () => {
  it('returns keys present in existing but not in generated', () => {
    const existing: TranslationBundle = {
      resources: {
        group: {
          title: 'Groepen',
          columns: { name: 'Naam', old_col: 'Oud' },
        },
      },
    };
    const generated: TranslationBundle = {
      resources: {
        group: { title: 'Groups', columns: { name: 'Name' } },
      },
    };
    expect(findStaleKeys(existing, generated)).toEqual([
      'resources.group.columns.old_col',
    ]);
  });

  it('returns empty when no stale keys', () => {
    const bundle: TranslationBundle = {
      resources: { group: { title: 'Groups' } },
    };
    expect(findStaleKeys(bundle, bundle)).toEqual([]);
  });

  it('detects stale enum keys after rename', () => {
    const existing: TranslationBundle = {
      enums: {
        OldEnum: { A: 'A' },
        Status: { ACTIVE: 'Active' },
      },
    };
    const generated: TranslationBundle = {
      enums: { Status: { ACTIVE: 'Active' } },
    };
    expect(findStaleKeys(existing, generated)).toEqual([
      'enums.OldEnum.A',
    ]);
  });
});

// ── serializeTranslationBundle ──────────────────────────────────────

describe('serializeTranslationBundle', () => {
  it('produces JSON with 2-space indent and trailing newline', () => {
    const bundle: TranslationBundle = {
      resources: { group: { title: 'Groups' } },
    };
    const out = serializeTranslationBundle(bundle);
    expect(out).toContain('  ');
    expect(out.endsWith('\n')).toBe(true);
    expect(JSON.parse(out)).toEqual(bundle);
  });
});
