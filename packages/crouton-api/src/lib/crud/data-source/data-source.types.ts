import { type DataSource } from '@ghentcdh/crouton-core';

import type { DataSourceAdapter } from './data-source.adapter';

export type DataSourceEntry = {
  config: DataSource;
  adapter: DataSourceAdapter;
};
