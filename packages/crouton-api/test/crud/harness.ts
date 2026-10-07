import { Test } from '@nestjs/testing';
import supertest from 'supertest';

import { DataSourceSchema } from '@ghentcdh/crouton-core';

import { CroutonApiModule } from '../../src/lib/crouton-api.module';
import { PrismaDataSourceAdapter } from '../../src/lib/crud/data-source/prisma.adapter';
import { FileSystemResourceConfigLoader } from '../../src/lib/crud/loader/fs-resource-config.loader';
import { join } from 'node:path';


const RESOURCES_DIR = join(import.meta.dirname, 'resources');

export const createTestApp = async () => {
  // Dynamic import: client is generated in global-setup before tests run.
  const { PrismaClient } = await import('../prisma/generated/index.js');
  const prisma = new (PrismaClient as any)({
    datasourceUrl: process.env['TEST_DATABASE_URL'],
  });

  const loader = new FileSystemResourceConfigLoader(RESOURCES_DIR, '/api');
  const configs = await loader.loadAll();

  const adapter = new PrismaDataSourceAdapter(prisma);
  const dataSourceConfig = DataSourceSchema.parse({ name: 'default', default: true });
  const dataSources = [{ config: dataSourceConfig, adapter }];

  const moduleRef = await Test.createTestingModule({
    imports: [
      await CroutonApiModule.forLoader(loader, configs, dataSources, {
        baseUrl: '/api',
        prefix: 'api',
      }),
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  return {
    app,
    prisma,
    request: supertest(app.getHttpServer()),
    close: async () => {
      await app.close();
      await prisma.$disconnect();
    },
  };
};
