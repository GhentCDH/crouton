import { type DataSource } from '@ghentcdh/crouton-core';

export type DataSourceEntry = {
  config: DataSource;
  client: any; // PrismaClient from any generated schema
};
