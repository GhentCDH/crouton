import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CURRENT_RESOURCE_VERSION } from '@ghentcdh/crouton-core';

import { loadResourceConfigsFromDir } from './index';

import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * #595 / #600 — a schema.ts that fails to import, or doesn't default-export a
 * zod schema, must be a recorded load error, not a resource served without one.
 */
const resourceJson = (name: string) =>
  JSON.stringify({
    name,
    route: name,
    source: { model: name[0].toUpperCase() + name.slice(1) },
    tag: name,
    operations: {},
    schemaVersion: CURRENT_RESOURCE_VERSION,
    columns: { id: { idField: true }, name: {} },
  });

describe('schema.ts load failures', () => {
  let dir: string;
  const write = (path: string, contents: string) => {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), contents);
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'crouton-schema-fail-'));
    resourceLoadErrorsRegistry.clear();
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('records an import failure and does not serve the resource', async () => {
    write('order/resource.json', resourceJson('order'));
    write('order/schema.ts', 'import { OrderSchema } from \'./generated/missing\';\nexport default OrderSchema;\n');
    write('book/resource.json', resourceJson('book'));

    const configs = await loadResourceConfigsFromDir(dir, '/api');

    expect(configs.map((c) => c.name)).toEqual(['book']);
    const errors = resourceLoadErrorsRegistry.getAll();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ name: 'order', path: join(dir, 'order/schema.ts') });
    expect(errors[0].error).toContain('Failed to import schema.ts');
  });

  it('records a schema.ts whose default export is not a zod schema', async () => {
    // What `export =` used to yield under the CJS loader: zod's `.default` method.
    write('order/resource.json', resourceJson('order'));
    write('order/schema.ts', 'export default function notASchema() {}\n');

    const configs = await loadResourceConfigsFromDir(dir, '/api');

    expect(configs).toEqual([]);
    expect(resourceLoadErrorsRegistry.getAll()[0]?.error).toContain(
      'schema.ts must `export default` a zod schema',
    );
  });
});
