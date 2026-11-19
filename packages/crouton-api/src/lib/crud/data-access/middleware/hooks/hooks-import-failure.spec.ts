import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CURRENT_RESOURCE_VERSION } from '@ghentcdh/crouton-core';

import { loadResourceConfigsFromDir } from '../../../loader';
import { resourceLoadErrorsRegistry } from '../../../resource/resource-load-errors.registry';
import { buildSummary, getResourceStatus } from '../../../status/status.service';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * #574 — a hooks.ts that fails to import must fail closed: hooks carry access
 * control, so the resource is reported as an error and not served at all.
 */
const BROKEN_HOOKS = `import scope from './does-not-exist';
export default { beforeFindAll: (q) => ({ ...q, filter: [...q.filter, scope] }) };`;
const GOOD_HOOKS = 'export default { beforeFindAll: (q) => q };';

const resourceJson = (name: string, extraColumns: Record<string, unknown> = {}) =>
  JSON.stringify({
    name,
    route: name,
    source: { model: name[0].toUpperCase() + name.slice(1) },
    tag: name,
    operations: {},
    schemaVersion: CURRENT_RESOURCE_VERSION,
    columns: { id: { idField: true }, name: {}, ...extraColumns },
  });

describe('hooks import failure fails closed (#574)', () => {
  let dir: string;
  const write = (path: string, contents: string) => {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), contents);
  };
  const statusOf = async () => {
    const configs = await loadResourceConfigsFromDir(dir, '/api');
    return { configs, summary: buildSummary([], getResourceStatus(configs)) };
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'crouton-hooks-fail-'));
    resourceLoadErrorsRegistry.clear();
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('control: a resource with working hooks is served and status is ok', async () => {
    write('family/resource.json', resourceJson('family'));
    write('family/hooks.ts', GOOD_HOOKS);
    const { configs, summary } = await statusOf();
    expect(configs.map((c) => c.name)).toEqual(['family']);
    expect(summary.ok).toBe(true);
  });

  it('a broken hooks.ts: resource not served, error recorded, status not ok', async () => {
    write('family/resource.json', resourceJson('family'));
    write('family/hooks.ts', BROKEN_HOOKS);
    write('book/resource.json', resourceJson('book'));

    const { configs, summary } = await statusOf();

    expect(configs.map((c) => c.name)).toEqual(['book']);
    const errors = resourceLoadErrorsRegistry.getAll();
    expect(errors.map((e) => e.name)).toEqual(['family']);
    expect(errors[0]?.error).toContain('Failed to import hooks');
    expect(summary.ok).toBe(false);
    expect(summary.resourceErrors).toBe(1);
  });

  it('a broken sub-resource hooks file takes the parent down (it serves the child routes)', async () => {
    write(
      'family/resource.json',
      resourceJson('family', { expense: { label: 'Expenses', fieldInput: { resource: './expense/resource.json' } } }),
    );
    write('family/expense/resource.json', resourceJson('expense', { familyId: {} }));
    write('family/expense/hooks.ts', BROKEN_HOOKS);

    const { configs, summary } = await statusOf();

    expect(configs).toEqual([]);
    const [error] = resourceLoadErrorsRegistry.getAll();
    expect(error?.name).toBe('family.expense');
    expect(error?.error).toContain('Failed to import hooks');
    expect(summary.ok).toBe(false);
  });
});
