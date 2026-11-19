import { BadRequestException } from '@nestjs/common';
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

/** #557 — `?filter=own:true:equals` on a boolean column reaches Prisma as a boolean. */
describe('boolean filter through the controller (#557)', () => {
  const wheres: unknown[] = [];
  let dir: string;
  let controller: MockController;
  const list = (filter: string[]) =>
    controller['findAll']({ page: 1, pageSize: 20, sort: 'id', sortDir: 'asc', filter }, {});

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'crouton-bool-filter-'));
    resourceLoadErrorsRegistry.clear();
    wheres.length = 0;
    mkdirSync(join(dir, 'userBook'), { recursive: true });
    writeFileSync(
      join(dir, 'userBook', 'resource.json'),
      JSON.stringify({
        name: 'userBook',
        route: 'userBook',
        source: { model: 'UserBook' },
        tag: 'UserBook',
        operations: {},
        schemaVersion: CURRENT_RESOURCE_VERSION,
        columns: { id: { idField: true }, own: { type: 'boolean' } },
      }),
    );
    const [config] = await loadResourceConfigsFromDir(dir, '/api');
    const Cls = createCrudController(invalid<Resource>(config), '/api');
    const prisma = {
      UserBook: {
        findMany: async (args: { where?: unknown }) => {
          wheres.push(args.where);
          return [];
        },
        count: async () => 0,
      },
    };
    controller = new Cls(
      invalid<DataSourceRegistry>({ resolve: () => prisma, entries: () => [] }),
      invalid<ResourceConfigRegistry>({ getByRoute: async () => undefined }),
    ) as MockController;
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it.each([['own:true:equals'], ['own:true']])('%s → { own: { equals: true } }', async (filter) => {
    await list([filter]);
    expect(wheres[0]).toEqual({ AND: [{ own: { equals: true } }] });
  });

  it('a non-boolean value is a 400', async () => {
    await expect(list(['own:maybe:equals'])).rejects.toBeInstanceOf(BadRequestException);
  });
});
