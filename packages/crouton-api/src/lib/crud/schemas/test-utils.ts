/**
 * Shared test utilities for API schema endpoint tests.
 *
 * `bootCase(caseName)` copies a fixture from crouton-core/test-fixtures/resources,
 * boots a real Nest app from it, and returns the app + a supertest http instance.
 *
 * Cleanup (app.close, rmSync) is the caller's responsibility — put it in afterAll/afterEach.
 */

import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import supertest from 'supertest';
import { vi } from 'vitest';

import { clearResourceExtensions } from '@ghentcdh/crouton-core';

import { CroutonApiModule } from '../../crouton-api.module';
import type { DataSourceEntry } from '../data-source';
import { loadResourceConfigsFromDir } from '../loader';
import { FileSystemResourceConfigLoader } from '../loader/fs-resource-config.loader';
import type { Resource } from '../resource/ResourceConfig.schema';
import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export const FIXTURES_ROOT = resolve(
  __dirname,
  '../../../../../crouton-core/test-fixtures/resources',
);

export const BASE_URL = 'http://localhost:3000';

/** Path to the case's enum registry (may not exist — loadEnumRegistry handles that). */
const enumsFileFor = (dir: string) => join(dir, 'crouton.enums.json');

/**
 * Build a minimal stub DataSourceEntry whose adapter satisfies `adapterHasCrud`
 * for all resources. Schema endpoints never hit the DB, so vi.fn() suffice.
 */
export const stubDataSources = (_configs: Resource[]): DataSourceEntry[] => {
  // A Proxy client so `client.AnyModelName` returns an object with CRUD delegates.
  const client = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (typeof prop === 'string' && prop !== 'then') {
          return {
            findMany: vi.fn().mockResolvedValue([]),
            count: vi.fn().mockResolvedValue(0),
            findUnique: vi.fn().mockResolvedValue(null),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({}),
            update: vi.fn().mockResolvedValue({}),
            delete: vi.fn().mockResolvedValue({}),
          };
        }
        return undefined;
      },
    },
  );

  return [
    {
      config: { name: 'default', default: true } as any,
      adapter: {
        kind: 'prisma' as const,
        client,
        supports: (_model: string) => true,
        findAll: vi.fn().mockResolvedValue({ data: [], count: 0 }),
        count: vi.fn().mockResolvedValue(0),
        findOne: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        patch: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
      },
    },
  ];
};

export type BootedCase = {
  app: NestExpressApplication;
  http: ReturnType<typeof supertest>;
  dir: string;
  cleanup: () => Promise<void>;
};

/**
 * Boot a real NestJS app from a fixture case directory.
 *
 * A minimal crouton.json exists in packages/crouton-api/ so loadConfig() succeeds.
 * The fixture is copied to a tmp dir so dev-mode migration doesn't corrupt the fixture.
 */
export const bootCase = async (
  caseName: string,
  appConfig: Partial<{ baseUrl: string; prefix: string; schemaEnricher: any }> = {},
): Promise<BootedCase> => {
  // Copy fixture to tmp dir (dev-mode migration rewrites resource.json on disk)
  const src = join(FIXTURES_ROOT, caseName);
  const dir = mkdtempSync(join(tmpdir(), `crouton-test-${caseName}-`));
  cpSync(src, dir, { recursive: true });

  // Load resource configs from the tmp dir
  const configs = await loadResourceConfigsFromDir(dir, BASE_URL, enumsFileFor(dir));
  const loader = new FileSystemResourceConfigLoader(dir, BASE_URL, enumsFileFor(dir));

  const module = await CroutonApiModule.forLoader(
    loader,
    configs,
    stubDataSources(configs),
    {
      baseUrl: BASE_URL,
      prefix: 'api',
      ...appConfig,
    },
  );

  const ref = await Test.createTestingModule({ imports: [module] }).compile();
  const app = ref.createNestApplication<NestExpressApplication>();
  await app.init();

  const cleanup = async () => {
    await app.close();
    clearResourceExtensions();
    resourceLoadErrorsRegistry.clear();
    vi.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  };

  return { app, http: supertest(app.getHttpServer()), dir, cleanup };
};
