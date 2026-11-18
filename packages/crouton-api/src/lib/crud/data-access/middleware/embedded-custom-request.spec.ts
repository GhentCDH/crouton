import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CURRENT_RESOURCE_VERSION } from '@ghentcdh/crouton-core';

import { invalid } from '../../../../testing/index';
import { createCrudController } from '../../crud-controller.factory';
import type { DataSourceRegistry } from '../../data-access/adapter';
import { loadResourceConfigsFromDir } from '../../loader';
import type { Resource } from '../../resource/ResourceConfig.schema';
import { resourceLoadErrorsRegistry } from '../../resource/resource-load-errors.registry';
import type { ResourceConfigRegistry } from '../../resource-config.registry';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type MockController = Record<string, (...args: unknown[]) => Promise<unknown>>;

/**
 * #556 — `GET /families/:id` embeds the custom `members` child. Its
 * `repository.ts` must get the caller's request, like `GET /families/:id/members`.
 */
const CHILD_REPOSITORY = `export default {
  findAllByParent: async (parentId, params, ctx) => {
    globalThis.__CTX__.push(ctx);
    return { data: [{ id: 'm1', name: 'Ann' }], count: 1 };
  },
};`;

describe('embedded custom child gets the request context (#556)', () => {
  const CTX: Array<Record<string, unknown>> = [];
  let tempDir: string;
  let controller: MockController;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'crouton-embed-ctx-'));
    resourceLoadErrorsRegistry.clear();
    CTX.length = 0;
    (globalThis as Record<string, unknown>)['__CTX__'] = CTX;

    const membersDir = join(tempDir, 'families', 'members');
    mkdirSync(membersDir, { recursive: true });
    writeFileSync(
      join(tempDir, 'families', 'resource.json'),
      JSON.stringify({
        name: 'families',
        route: 'families',
        source: { model: 'Family' },
        tag: 'Family',
        operations: {},
        schemaVersion: CURRENT_RESOURCE_VERSION,
        columns: {
          id: { idField: true },
          name: {},
          members: { label: 'Members', hiddenInForm: false, fieldInput: { resource: './members/resource.json' } },
        },
      }),
    );
    writeFileSync(
      join(membersDir, 'resource.json'),
      JSON.stringify({
        kind: 'custom',
        name: 'members',
        route: 'members',
        tag: 'Member',
        operations: {},
        schemaVersion: CURRENT_RESOURCE_VERSION,
        columns: { id: { type: 'string', idField: true }, name: { type: 'string', defaultSort: true } },
      }),
    );
    writeFileSync(join(membersDir, 'repository.ts'), CHILD_REPOSITORY);

    const configs = await loadResourceConfigsFromDir(tempDir, '/api');
    const parent = configs.find((c) => c.name === 'families');
    const Cls = createCrudController(invalid<Resource>(parent), '/api');
    const prisma = {
      Family: {
        findUnique: async () => ({ id: 'f1', name: 'Smith' }),
        findFirst: async () => ({ id: 'f1', name: 'Smith' }),
        findMany: async () => [],
        count: async () => 0,
      },
    };
    controller = new Cls(
      invalid<DataSourceRegistry>({ resolve: () => prisma, entries: () => [] }),
      invalid<ResourceConfigRegistry>({ getByRoute: async () => undefined }),
    ) as MockController;
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    delete (globalThis as Record<string, unknown>)['__CTX__'];
  });

  it('passes request, op and parent to the custom repository on parent findOne', async () => {
    const request = { params: { id: 'f1' }, user: { id: 'u1' } };
    const row = (await controller['findOne']('f1', request)) as Record<string, unknown>;

    expect(row['members']).toEqual([expect.objectContaining({ id: 'm1' })]);
    expect(CTX[0]).toMatchObject({
      request,
      op: 'findAll',
      parent: { route: 'families', param: 'id', id: 'f1' },
    });
  });
});
