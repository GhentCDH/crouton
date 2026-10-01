import { describe, expect, it } from 'vitest';

import type { CroutonStatus, ResourceStatus } from './status.types';
import { collectIssues, resourceState, sortResources } from './status.utils';

const makeStatus = (overrides: Partial<CroutonStatus> = {}): CroutonStatus => ({
  version: '1.0.0',
  croutonVersion: '0.0.1',
  environment: 'test',
  summary: { ok: true, databaseErrors: 0, resourceErrors: 0, warningCount: 0 },
  databases: [],
  resources: [],
  ...overrides,
});

const makeResource = (overrides: Partial<ResourceStatus> = {}): ResourceStatus => ({
  name: 'test',
  path: 'resources/test',
  valid: true,
  ...overrides,
});

describe('resourceState', () => {
  it('draft takes priority over invalid', () =>
    expect(resourceState(makeResource({ draft: true, valid: false }))).toBe('draft'));
  it('error: invalid non-draft', () =>
    expect(resourceState(makeResource({ valid: false }))).toBe('error'));
  it('migration: expectedVersion differs', () =>
    expect(resourceState(makeResource({ version: 2, expectedVersion: 3 }))).toBe('migration'));
  it('warning: has warnings', () =>
    expect(resourceState(makeResource({ warnings: ['oops'] }))).toBe('warning'));
  it('hidden', () =>
    expect(resourceState(makeResource({ hidden: true }))).toBe('hidden'));
  it('ok', () => expect(resourceState(makeResource())).toBe('ok'));
});

describe('sortResources', () => {
  it('errors first, warnings next, rest alpha', () => {
    const resources = [
      makeResource({ name: 'beta' }),
      makeResource({ name: 'alpha' }),
      makeResource({ name: 'broken', valid: false }),
      makeResource({ name: 'warn', warnings: ['x'] }),
    ];
    const sorted = sortResources(resources).map((r) => r.name);
    expect(sorted).toEqual(['broken', 'warn', 'alpha', 'beta']);
  });

  it('stable within same state: alphabetical', () => {
    const resources = [makeResource({ name: 'z' }), makeResource({ name: 'a' })];
    expect(sortResources(resources).map((r) => r.name)).toEqual(['a', 'z']);
  });
});

describe('collectIssues', () => {
  it('empty when all ok', () => expect(collectIssues(makeStatus())).toHaveLength(0));

  it('db down → error', () => {
    const issues = collectIssues(
      makeStatus({ databases: [{ name: 'main', connected: false, error: 'ECONNREFUSED' }] }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: 'error', source: 'database', target: 'main' });
  });

  it('invalid resource → error', () => {
    const issues = collectIssues(
      makeStatus({ resources: [makeResource({ name: 'books', valid: false, error: 'bad field' })] }),
    );
    expect(issues[0]).toMatchObject({ severity: 'error', source: 'resource', target: 'books' });
  });

  it('migration needed → warning', () => {
    const issues = collectIssues(
      makeStatus({ resources: [makeResource({ name: 'authors', version: 2, expectedVersion: 3 })] }),
    );
    expect(issues[0]).toMatchObject({
      severity: 'warning',
      source: 'resource',
      message: 'needs migration to v3',
    });
  });

  it('resource warnings → one issue per warning', () => {
    const issues = collectIssues(
      makeStatus({ resources: [makeResource({ name: 'x', warnings: ['w1', 'w2'] })] }),
    );
    expect(issues).toHaveLength(2);
    expect(issues.every((i) => i.severity === 'warning')).toBe(true);
  });

  it('draft not included in issues', () => {
    const issues = collectIssues(
      makeStatus({ resources: [makeResource({ name: 'draft', draft: true, valid: false })] }),
    );
    expect(issues).toHaveLength(0);
  });

  it('i18n empty keys → warning per language', () => {
    const issues = collectIssues(
      makeStatus({
        i18n: {
          active: true,
          defaultLanguage: 'en',
          languages: ['en', 'nl'],
          bundles: [
            { language: 'nl', keyCount: 10, emptyKeys: 3 },
            { language: 'en', keyCount: 10, emptyKeys: 0 },
          ],
        },
      }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: 'warning', source: 'i18n', target: 'nl' });
  });

  it('i18n inactive → info issue', () => {
    const issues = collectIssues(
      makeStatus({
        i18n: {
          active: false,
          defaultLanguage: 'en',
          languages: ['en'],
          bundles: [{ language: 'en', keyCount: 10, emptyKeys: 0 }],
        },
      }),
    );
    expect(issues.some((i) => i.severity === 'info')).toBe(true);
  });
});
